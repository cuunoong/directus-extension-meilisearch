import { flatten } from "flat";
import { stripHtml } from "string-strip-html";
import { TaskStatus } from "meilisearch";
import { MeilisearchTaskResult } from "./models";
import sleep from "sleep-promise";

const flattenAndStripHtml = (object) => {
    // Flatten the object, so we can easily iterate the properties.
    const flattenedObject = flatten(object);

    for (const key of Object.keys(flattenedObject)) {
        // Delete properties that are subproperties of a content type and aren't interested in including in a meilisearch document.
        if (
            (key.includes("blocks") || key.includes("content")) &&
            !(
                key.endsWith(".title") ||
                key.endsWith(".content") ||
                key.endsWith(".text") ||
                key.endsWith(".caption") ||
                key.endsWith(".description") ||
                key.endsWith(".summary")
            )
        ) {
            delete flattenedObject[key];
            continue;
        }

        // Delete the property when the value is null.
        if (flattenedObject[key] == null) {
            delete flattenedObject[key];
            continue;
        }

        // We're only interested in stripping html from certain properties (any property that could potentially contain html).
        if (
            !key.endsWith("content") &&
            !key.endsWith("description") &&
            !key.endsWith("text") &&
            !key.endsWith("summary") &&
            !key.endsWith("caption")
        )
            continue;
        flattenedObject[key] = stripHtml(flattenedObject[key]).result;
    }
    return flattenedObject;
};

const waitForMeilisearchTask = async (client, task) => {
    let counter = 0;
    let taskStatus = TaskStatus.TASK_ENQUEUED;

    while (
        taskStatus !== TaskStatus.TASK_SUCCEEDED &&
        taskStatus !== TaskStatus.TASK_FAILED &&
        taskStatus !== TaskStatus.TASK_CANCELED
    ) {
        // Get latest status of task.
        const taskInfo = await client.getTask(task.taskUid);
        taskStatus = taskInfo.status;
        if (taskStatus === TaskStatus.TASK_FAILED)
            taskError = `${taskInfo.error?.code}: ${taskInfo.error?.message}`;

        // When we've tried 5 times, exit.
        if (counter === 5) break;

        // Wait 5 seconds before trying again.
        await sleep(500);

        counter++;
    }

    // When the delete operation failed, send admin a notification.
    if (taskStatus === TaskStatus.TASK_FAILED) {
        return new MeilisearchTaskResult(false, taskStatus);
    }

    return new MeilisearchTaskResult(true, "");
};

export { flattenAndStripHtml, sleep, waitForMeilisearchTask };
