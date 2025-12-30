import { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId } from './config.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export const firebaseInitializer = function firebaseInitializer() {
    firebaseConfig = {
        apiKey: apiKey,
        authDomain: authDomain,
        projectId: projectId,
        storageBucket: storageBucket,
        messagingSenderId: messagingSenderId,
        appId: appId,
        measurementId: measurementId
    };
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
};