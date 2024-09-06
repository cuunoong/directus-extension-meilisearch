class CollectionConfiguration {
    constructor(collection, filter, fields) {
        this.Collection = collection;
        this.Filter = filter;
        this.Fields = fields;
    }
}

export class MeilisearchSettings {
    constructor(data) {
        this.Host = data.host;
        this.Key = data.api_key;

        const configurationData = data.collections_configuration;
        this.CollectionsConfiguration = configurationData.map(
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
        this.Success = success;
        this.Message = message;
    }
}
