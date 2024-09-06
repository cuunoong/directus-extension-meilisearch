# Directus Meilisearch Extension

## Overview

The Directus Meilisearch Extension integrates Meilisearch with Directus to enhance search functionality across your Directus-managed data. This extension creates a Directus collection to store Meilisearch settings and allows you to define which collections should be indexed by Meilisearch.

## Features

-   **Automatic Table Creation:** Creates a Directus collection named `meilisearch_settings` with the following fields:

    -   `host`: URL of the Meilisearch instance.
    -   `api_key`: API key for accessing Meilisearch.
    -   `collections_configuration`: JSON configuration for collections to be indexed.

-   **Configuration Required:** After installation, configure the extension by providing necessary details such as the Meilisearch host, API key, and collection indexing configurations.

## Installation

1. **Install the Extension:**

    - Upload the extension to your Directus instance or use Directus CLI commands for installation.

2. **Setup Configuration:**
    - Go to the Directus Admin Panel and find the `meilisearch_settings` collection.
    - Fill in the required fields:
        - **Host:** The URL of your Meilisearch instance (e.g., `https://meilisearch.example.com`).
        - **API Key:** Your Meilisearch API key.
        - **Collections Configuration:** JSON configuration for collections to be indexed.

## Example Configuration

Below is an example JSON for the `collections_configuration` field:

```json
[
    {
        "collection": "product",
        "filter": {
            "status": "available"
        },
        "fields": ["id", "name", "description", "price", "category"]
    },
    {
        "collection": "customer",
        "filter": {
            "status": "active"
        },
        "fields": ["id", "name", "email", "phone"]
    }
]
```

-   **collection:** The Directus collection name to index.
-   **filter:** Conditions to filter records (e.g., only include records where `status` is `available`).
-   **fields:** List of fields to be included in the Meilisearch index.

## Usage

-   **Access Settings:** Modify the `meilisearch_settings` collection to update Meilisearch configurations.
-   **Index Data:** Use the configured settings to index records from specified collections into Meilisearch.

## Helper Functions

-   **`flattenAndStripHtml(object)`**: Flattens and cleans HTML content from object properties.
-   **`sleep(ms)`**: Delays execution for a specified duration in milliseconds.
-   **`waitForMeilisearchTask(client, task)`**: Monitors and waits for a Meilisearch task to complete, including retry logic.

## Troubleshooting

-   Ensure that the `host` and `api_key` fields are correctly entered and valid.
-   Verify that the `collections_configuration` JSON format is correct and matches your Directus collection names and field names.

## Contributing

Contributions are welcome! Please submit issues or pull requests to improve this extension.

## License

This extension is licensed under the [MIT License](LICENSE).
