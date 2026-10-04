self.addEventListener("push", (event) => {
    let data = {
        title: "Availability",
        body: "New notification"
    };

    if (event.data) {
        try {
            data = {
                ...data,
                ...event.data.json()
            };
        } catch {
            data.body = event.data.text();
        }
    }

    event.waitUntil(self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: {
            url: data.url || "/"
        }
    }));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const url = event.notification.data?.url || "/";

    event.waitUntil(clients.openWindow(url));
});