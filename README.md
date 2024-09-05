# Directus Extension - Meilisearch

This is a custom extension for [Directus](https://directus.io) that integrates [Meilisearch](https://www.meilisearch.com), providing fast and powerful full-text search capabilities for your Directus collections.

## Features

-   Full integration with Meilisearch for Directus collections.
-   Automatic indexing of data when records are created, updated, or deleted.
-   Advanced full-text search across multiple fields in your collections.
-   Lightning-fast search performance with Meilisearch's search-as-you-type functionality.

## Installation

To install the Directus Meilisearch extension, follow these steps:

1. Install the extension via npm:

```bash
npm install directus-extension-meilisearch
```

2. Configure the Meilisearch instance in Directus:

    Add the following configuration in your `directus` settings or environment file:

```bash
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your_api_key
```

3. Restart Directus to load the new extension.

## Usage

Once installed, this extension will automatically start syncing your collections with Meilisearch. You can perform searches using Meilisearch's full-text search API through the Directus interface or via your custom endpoints.

### Indexing Data

By default, data from your Directus collections will be automatically indexed when the following events occur:

-   **Create**: New records are added.
-   **Update**: Existing records are modified.
-   **Delete**: Records are removed.

You can customize which collections and fields are indexed by adjusting the settings in `index.js`.

### Searching Data

You can execute searches against Meilisearch directly from your Directus app or via Meilisearch’s API.

## Configuration

To configure which collections and fields are indexed, modify the extension configuration in `index.js`. You can also adjust the following settings:

-   **Index Name**: Define custom names for Meilisearch indexes.
-   **Searchable Fields**: Choose which fields in your collections should be indexed and searchable.

## Requirements

-   Directus v9 or higher.
-   Meilisearch v0.23.1 or higher.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests on GitHub to improve the extension.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you have any questions or need help, feel free to open an issue on GitHub or reach out via Directus' community forums.

---

Built with ❤️ by Arif Iskandar from Forezyy.id
