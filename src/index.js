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
                    try {
                        logger.info(
                            `Start Reindex collections into Meilisearch.`
                        );

                        const schema = await getSchema();
                        const collectionService = new CollectionsService({
                            schema,
                        });
                        const collections =
                            await collectionService.readByQuery();

                        // Check if Meilisearch settings table exists
                        if (
                            collections.find(
                                (collection) =>
                                    collection.collection === TABLE_NAME
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
                        const meilisearchSettings = new MeilisearchSettings(
                            entity
                        );

                        // Exit if the integration hasn't been properly configured
                        if (
                            !meilisearchSettings.host ||
                            !meilisearchSettings.apiKey ||
                            !meilisearchSettings.collectionsConfiguration.length
                        )
                            return;

                        // Create Meilisearch client
                        const client = new MeiliSearch({
                            host: meilisearchSettings.host,
                            apiKey: meilisearchSettings.apiKey,
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
                                    configuration.collection,
                                    {
                                        primaryKey: configuration.key,
                                    }
                                );
                                const taskResult = await waitForMeilisearchTask(
                                    client,
                                    task
                                );
                                if (!taskResult.success) {
                                    logger.warn(
                                        `Unable to create index for collection ${configuration.collection}`
                                    );
                                    logger.warn(taskResult.message);
                                } else {
                                    index = await client.getIndex(
                                        configuration.collection
                                    );
                                }
                            }

                            if (!index) return;

                            if (configuration.filterable)
                                await index.updateSettings({
                                    filterableAttributes:
                                        configuration.filterable,
                                });

                            await index.deleteAllDocuments();

                            // Create items service for fetching entities
                            const itemsService = new ItemsService(
                                configuration.collection,
                                {
                                    schema,
                                }
                            );

                            let pageSize = 100;
                            for (let offset = 0; ; offset += pageSize) {
                                const entities = await itemsService.readByQuery(
                                    {
                                        fields: configuration.fields,
                                        filter: configuration.filter,
                                        limit: pageSize,
                                        offset,
                                    }
                                );

                                if (!entities || !entities.length) break;

                                const flattenedEntities = entities.map(
                                    (entity) => flattenAndStripHtml(entity)
                                );

                                await index.updateDocuments(flattenedEntities, {
                                    primaryKey: "id",
                                });

                                logger.info(
                                    `Updated ${flattenedEntities.length} entities in Meilisearch index ${configuration.collection}.`
                                );
                            }
                        }

                        logger.info("Finished reindexing.");
                    } catch (error) {
                        logger.error(error);
                    }
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
                !meilisearchSettings.host ||
                !meilisearchSettings.apiKey ||
                !meilisearchSettings.collectionsConfiguration.length
            )
                return;

            logger.info("Meilisearch integration is OK.");

            const client = new MeiliSearch({
                host: meilisearchSettings.host,
                apiKey: meilisearchSettings.apiKey,
            });

            // Set up hooks for create, update, and delete actions
            for (const configuration of meilisearchSettings.collectionsConfiguration) {
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
