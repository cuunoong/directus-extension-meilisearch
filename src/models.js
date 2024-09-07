class CollectionConfiguration {
    constructor(key, collection, filter, fields, filterable, sortable) {
        this.key = key;
        this.collection = collection;
        this.filter = filter;
        this.fields = fields;
        this.filterable = filterable;
        this.sortable = sortable;
    }
}

export class MeilisearchSettings {
    constructor(data) {
        this.host = data.host;
        this.apiKey = data.api_key;

        const configurationData = data.collections_configuration;
        this.collectionsConfiguration = configurationData.map(
            (config) =>
                new CollectionConfiguration(
                    config.key,
                    config.collection,
                    config.filter,
                    config.fields,
                    config.filterable,
                    config.sortable
                )
        );
    }
}

export class MeilisearchTaskResult {
    constructor(success, message) {
        this.success = success;
        this.message = message;
    }
}
