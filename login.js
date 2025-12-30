// Import the functions you need from the SDKs you need
import { firebaseInitializer } from "./helper/initializeFirebase";
import { backToMapBtn, signIn } from "./helper/sign_in_up.js";

firebaseInitializer();
backToMapBtn();
signIn();