class CollectionConfiguration {
    constructor(collection, filter, fields) {
        this.collection = collection;
        this.filter = filter;
        this.fields = fields;
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
                    config.collection,
                    config.filter,
                    config.fields
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
