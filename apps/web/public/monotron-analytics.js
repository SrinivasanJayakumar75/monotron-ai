(function () {
    var script = document.currentScript;
    if (!script) {
        return;
    }
    var ingestKey = script.getAttribute("data-ingest-key");
    var endpoint = script.getAttribute("data-endpoint");
    if (!ingestKey || !endpoint) {
        console.warn("[Monotron Analytics] Missing data-ingest-key or data-endpoint");
        return;
    }

    var NS = "monotron_analytics_";
    var sid = sessionStorage.getItem(NS + "sid");
    var st = sessionStorage.getItem(NS + "st");
    if (!sid || !st) {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
            sid = crypto.randomUUID();
        } else {
            sid =
                "s" +
                String(Date.now()) +
                "-" +
                String(Math.random()).slice(2, 11);
        }
        st = String(Date.now());
        sessionStorage.setItem(NS + "sid", sid);
        sessionStorage.setItem(NS + "st", st);
    }

    function durationMs() {
        return Math.max(0, Date.now() - Number(st));
    }

    function path() {
        return location.pathname + location.search;
    }

    function payload(action) {
        return JSON.stringify({
            ingestKey: ingestKey,
            clientSessionId: sid,
            path: path(),
            action: action,
            durationMs: durationMs(),
        });
    }

    function send(action) {
        fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload(action),
            mode: "cors",
            keepalive: true,
        }).catch(function () {});
    }

    send("start");
    setInterval(function () {
        send("ping");
    }, 10000);

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
            send("end");
        }
    });

    window.addEventListener("pagehide", function () {
        if (navigator.sendBeacon) {
            navigator.sendBeacon(
                endpoint,
                new Blob([payload("end")], { type: "application/json" })
            );
        } else {
            send("end");
        }
    });
})();
