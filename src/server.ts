import {
    app,
} from "./app.js";

import {
    appConfig,
} from "./config/app.js";

import {
    registerServerLifecycle,
} from "./server/serverLifecycle.js";

const server = app.listen(
    appConfig.port,
    appConfig.host,
    () => {
        console.log(
            `Server running at http://${appConfig.host}:${appConfig.port}`,
        );

        console.log(
            "Open the browser session first at /api/open-browser",
        );
    },
);

registerServerLifecycle({
    server,
});