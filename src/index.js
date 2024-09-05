import { MeiliSearch } from "meilisearch";

const client = new MeiliSearch({
    host: process.env.MEILISEARCH_HOST,
    apiKey: process.env.MEILISEARCH_API_KEY,
});
const index = client.index("directus_index");

export default ({ filter, action }) => {
    filter("items.create", () => {
        console.log("Creating Item!");
    });

    action("items.create", () => {
        console.log("Item created!");
    });
};
