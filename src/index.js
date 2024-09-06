import { defineHook } from "@directus/extensions-sdk";
import { MeiliSearch } from "meilisearch";
import { MeilisearchSettingsTable } from "./tables";
import { flattenAndStripHtml, waitForMeilisearchTask } from "./helpers";
import { MeilisearchSettings } from "./models";

export default defineHook(
    async ({ init, action }, { logger, services, getSchema }) => {
        const TABLE_NAME = "meilisearch_settings";
        const { CollectionsService, ItemsService } = services;
        const schema = await getSchema();

        init("cli.before", ({ program }) => {
            program
                .command("meilisearch:reindex")
                .description("Reindex collections into Meilisearch.")
                .action(async () => {
                    const schema = await getSchema();
                    const collectionService = new CollectionsService({
                        schema,
                    });
                    const collections = await collectionService.readByQuery();

                    // Check if Meilisearch settings table exists
                    if (
                        collections.find(
                            (collection) => collection.collection === TABLE_NAME
                        ) === undefined
                    ) {
                        logger.info(
                            "Unable to reindex collections. You must first set up the extension."
                        );
                        return;
                    }

                    // Get Meilisearch settings
                    const settingsService = new ItemsService(
                        "meilisearch_settings",
                        {
                            schema,
                        }
                    );
                    const entity = await settingsService.readOne("1");
                    const meilisearchSettings = new MeilisearchSettings(entity);

                    // Exit if the integration hasn't been properly configured
                    if (
                        !meilisearchSettings.Host ||
                        !meilisearchSettings.Key ||
                        !meilisearchSettings.CollectionsConfiguration.length
                    )
                        return;

                    // Create Meilisearch client
                    const client = new MeiliSearch({
                        host: meilisearchSettings.host,
                        apiKey: meilisearchSettings.key,
                    });

                    for (const configuration of meilisearchSettings.collectionsConfiguration) {
                        logger.info(
                            `Updating index for collection ${configuration.collection}`
                        );

                        let index = null;
                        try {
                            index = await client.getIndex(
                                configuration.collection
                            );
                        } catch (error) {
                            const task = await client.createIndex(
                                configuration.collection
                            );
                            const taskResult = await waitForMeilisearchTask(
                                client,
                                task
                            );
                            if (!taskResult.Success) {
                                logger.warn(
                                    `Unable to create index for collection ${configuration.collection}`
                                );
                                logger.warn(taskResult.Message);
                            } else {
                                index = await client.getIndex(
                                    configuration.collection
                                );
                            }
                        }
                        if (!index) return;

                        await index.deleteAllDocuments();

                        // Create items service for fetching entities
                        const itemsService = new ItemsService(
                            configuration.collection,
                            {
                                schema,
                            }
                        );

                        const pageSize = 100;
                        for (let offset = 0; ; offset += pageSize) {
                            const entities = await itemsService.readByQuery({
                                fields: configuration.fields,
                                filter: configuration.filter,
                                limit: pageSize,
                                offset,
                            });

                            if (!entities || !entities.length) break;

                            const flattenedEntities = entities.map((entity) =>
                                flattenAndStripHtml(entity)
                            );

                            await index.updateDocuments(flattenedEntities);

                            logger.info(
                                `Updated ${flattenedEntities.length} entities in Meilisearch index ${configuration.collection}.`
                            );
                        }
                    }

                    logger.info("Finished reindexing.");
                });
        });

        action("server.start", async () => {
            const collectionService = new CollectionsService({ schema });
            const collections = await collectionService.readByQuery();

            // Ensure Meilisearch settings table exists or create/update it
            if (
                collections.find(
                    (collection) => collection.collection === TABLE_NAME
                ) === undefined
            ) {
                await collectionService.createOne(MeilisearchSettingsTable);
                logger.info("Meilisearch Settings table created.");
                logger.info(
                    "Please fill out the settings and restart Directus."
                );
                return;
            } else {
                await collectionService.updateOne(
                    TABLE_NAME,
                    MeilisearchSettingsTable
                );
                logger.info("Meilisearch Settings table updated.");
            }

            // Get Meilisearch settings
            const settingsService = new ItemsService("meilisearch_settings", {
                schema,
            });
            const entity = await settingsService.readOne("1");
            const meilisearchSettings = new MeilisearchSettings(entity);

            // Exit if integration hasn't been set up
            if (
                !meilisearchSettings.Host ||
                !meilisearchSettings.Key ||
                !meilisearchSettings.CollectionsConfiguration.length
            )
                return;

            logger.info("Meilisearch integration is OK.");

            const client = new MeiliSearch({
                host: meilisearchSettings.Host,
                apiKey: meilisearchSettings.Key,
            });

            // Set up hooks for create, update, and delete actions
            for (const configuration of meilisearchSettings.CollectionsConfiguration) {
                action(
                    `${configuration.collection}.items.create`,
                    async (meta, context) => {
                        const itemsService = new ItemsService(
                            configuration.collection,
                            {
                                schema: context.schema,
                                accountability: context.accountability,
                            }
                        );

                        const entityId = meta.key;
                        const entities = await itemsService.readMany(
                            [entityId],
                            {
                                fields: configuration.fields,
                                filter: configuration.filter,
                            }
                        );

                        if (!entities.length) return;
                        const entity = entities[0];

                        const index = client.index(configuration.collection);
                        const flattenedEntity = flattenAndStripHtml(entity);
                        await index.addDocuments([flattenedEntity]);

                        logger.info(
                            `Added entity with id: "${entityId}" to Meilisearch.`
                        );
                    }
                );

                action(
                    `${configuration.collection}.items.update`,
                    async (meta, context) => {
                        const itemsService = new ItemsService(
                            configuration.collection,
                            {
                                schema: context.schema,
                                accountability: context.accountability,
                            }
                        );

                        const entityId = meta.keys[0];
                        const index = client.index(configuration.collection);

                        const entities = await itemsService.readMany(
                            [entityId],
                            {
                                fields: configuration.fields,
                                filter: configuration.filter,
                            }
                        );

                        if (!entities.length) {
                            await index.deleteDocument(entityId);
                            return;
                        }

                        const entity = entities[0];
                        const flattenedEntity = flattenAndStripHtml(entity);
                        await index.updateDocuments([flattenedEntity]);

                        logger.info(
                            `Updated entity with id: "${entityId}" in Meilisearch.`
                        );
                    }
                );

                action(
                    `${configuration.collection}.items.delete`,
                    async (meta, context) => {
                        const entityId = meta.keys[0];
                        const index = client.index(configuration.collection);
                        await index.deleteDocument(entityId);

                        logger.info(
                            `Deleted entity with id: "${entityId}" in Meilisearch.`
                        );
                    }
                );
            }
        });
    }
);
