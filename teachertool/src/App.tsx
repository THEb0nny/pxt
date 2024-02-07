import { useEffect, useContext, useState } from "react";
import { AppStateContext, AppStateReady } from "./state/appStateContext";
import { usePromise } from "./hooks";
import { makeNotification } from "./utils";
import * as Actions from "./state/actions";
import * as NotificationService from "./services/notificationService";
import { downloadTargetConfigAsync } from "./services/backendRequests";
import { logDebug } from "./services/loggingService";
import { HeaderBar } from "./components/HeaderBar";
import { MainPanel } from "./components/MainPanel";
import { Notifications } from "./components/Notifications";
import { CatalogModal } from "./components/CatalogModal";
import { postNotification } from "./transforms/postNotification";
import { loadCatalogAsync } from "./transforms/loadCatalogAsync";
import { loadValidatorPlansAsync } from "./transforms/loadValidatorPlansAsync";
import { tryLoadLastActiveRubricAsync } from "./transforms/tryLoadLastActiveRubricAsync";
import { ImportRubricModal } from "./components/ImportRubricModal";

export const App = () => {
    const { state, dispatch } = useContext(AppStateContext);
    const [inited, setInited] = useState(false);

    const ready = usePromise(AppStateReady, false);

    useEffect(() => {
        if (ready && !inited) {
            NotificationService.initialize();

            Promise.resolve().then(async () => {
                const cfg = await downloadTargetConfigAsync();
                dispatch(Actions.setTargetConfig(cfg || {}));
                pxt.BrowserUtils.initTheme();

                // Load catalog and validator plans into state.
                await loadCatalogAsync();
                await loadValidatorPlansAsync();
                await tryLoadLastActiveRubricAsync();

                // Test notification
                postNotification(makeNotification("🎓", 2000));

                setInited(true);
                logDebug("App initialized");
            });
        }
    }, [ready, inited]);

    return !inited ? (
        <div className="ui active dimmer">
            <div className="ui large main loader msft"></div>
        </div>
    ) : (
        <>
            <HeaderBar />
            <MainPanel />
            <CatalogModal />
            <ImportRubricModal />
            <Notifications />
        </>
    );
};
