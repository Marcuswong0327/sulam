

export default class FirebaseInitializer {
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

}