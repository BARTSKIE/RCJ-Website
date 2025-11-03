// js/firebase-config.js
import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { 
    getAuth 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    getDatabase 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCvxPjQyEjn5_vIVgwGhOgAVlIkx5chnWE",
    authDomain: "rcj-firebase-database.firebaseapp.com",
    databaseURL: "https://rcj-firebase-database-default-rtdb.firebaseio.com",
    projectId: "rcj-firebase-database",
    storageBucket: "rcj-firebase-database.firebasestorage.app",
    messagingSenderId: "322419824007",
    appId: "1:322419824007:web:8c797773a13fae041caf22",
};

// Initialize Firebase only once
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };