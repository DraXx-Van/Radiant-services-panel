import React, { useState, useEffect } from 'react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, updateDoc, deleteDoc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { Key, User, Plus, Trash2, Pause, Play, RefreshCw, LogOut, Sun, Moon, Search } from 'lucide-react';

const CustomModal = ({ title, message, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">{title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end space-x-3">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function App() {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userEmail, setUserEmail] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [keys, setKeys] = useState([]);
    const [newKeyDuration, setNewKeyDuration] = useState('');
    const [keyCreationError, setKeyCreationError] = useState('');
    const [showCreateKeyForm, setShowCreateKeyForm] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalAction, setModalAction] = useState(null);
    const [modalTargetKey, setModalTargetKey] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

    useEffect(() => {
        let firebaseConfig = {};
        if (typeof process.env.REACT_APP_FIREBASE_CONFIG !== 'undefined' && process.env.REACT_APP_FIREBASE_CONFIG) {
          try {
            firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);
          } catch (e) {
            console.error("Failed to parse REACT_APP_FIREBASE_CONFIG environment variable:", e);
            setAuthError("Failed to initialize Firebase due to config error.");
            setIsAuthReady(true);
            return;
          }
        } else {
            console.error("REACT_APP_FIREBASE_CONFIG is not defined.");
            setAuthError("Failed to initialize Firebase: Configuration missing.");
            setIsAuthReady(true);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            onAuthStateChanged(firebaseAuth, (user) => {
                if (user) {
                    setUserId(user.uid);
                    setUserEmail(user.email);
                } else {
                    setUserId(null);
                    setUserEmail(null);
                }
                setIsAuthReady(true);
            });
        } catch (err) {
            console.error("Firebase initialization failed:", err);
            setAuthError("Failed to initialize Firebase. Please check your configuration.");
            setIsAuthReady(true);
        }
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        const appId = 'default-app-id';
        if (!isAuthReady || !db || !userId) {
            setKeys([]);
            return;
        }

        const collectionPath = `artifacts/${appId}/users/${userId}/keys`;
        const q = collection(db, collectionPath);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const keysData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setKeys(keysData);
        }, (error) => {
            console.error("Error fetching keys:", error);
        });

        return () => unsubscribe();
    }, [isAuthReady, db, userId]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            console.error(err);
            setAuthError(err.message);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setKeys([]);
            setEmail('');
            setPassword('');
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    const generateShortKeyId = (length) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    };

    const createKey = async () => {
        if (!newKeyDuration || isNaN(parseInt(newKeyDuration))) {
            setKeyCreationError('Please enter a valid duration in days.');
            return;
        }
        const durationInDays = parseInt(newKeyDuration);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationInDays);
        const appId = 'default-app-id';

        const newKey = {
            key_id: generateShortKeyId(12),
            user_email: userEmail,
            hwid: null,
            status: 'active',
            creation_date: serverTimestamp(),
            expires_at: expiresAt,
            duration: durationInDays
        };

        try {
            const collectionPath = `artifacts/${appId}/users/${userId}/keys`;
            await addDoc(collection(db, collectionPath), newKey);
            setNewKeyDuration('');
            setShowCreateKeyForm(false);
            setKeyCreationError('');
        } catch (e) {
            console.error("Error adding document: ", e);
            setKeyCreationError("Failed to create key. Please try again.");
        }
    };

    const handleDeleteKey = (key) => {
        setModalTargetKey(key);
        setModalAction(() => async () => {
            try {
                const appId = 'default-app-id';
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/keys`, key.id);
                await deleteDoc(docRef);
                setShowModal(false);
            } catch (e) {
                console.error("Error deleting key: ", e);
            }
        });
        setShowModal(true);
    };

    const handleResetHwid = (key) => {
        setModalTargetKey(key);
        setModalAction(() => async () => {
            try {
                const appId = 'default-app-id';
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/keys`, key.id);
                await updateDoc(docRef, {
                    hwid: null
                });
                setShowModal(false);
            } catch (e) {
                console.error("Error resetting HWID: ", e);
            }
        });
        setShowModal(true);
    };

    const handleToggleStatus = async (key) => {
        const newStatus = key.status === 'active' ? 'paused' : 'active';
        try {
            const appId = 'default-app-id';
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/keys`, key.id);
            await updateDoc(docRef, {
                status: newStatus
            });
        } catch (e) {
            console.error("Error toggling key status: ", e);
        }
    };

    const renderAuthForm = () => (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <User className="h-10 w-10 text-indigo-600" />
                </div>
                <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">Welcome Back!</h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-8">Sign in to manage your keys.</p>
                {authError && (
                    <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-md mb-6 text-center">
                        <p>{authError}</p>
                    </div>
                )}
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            required
                        />
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            Sign In
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const renderKeyManager = () => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filteredKeys = keys.filter(key => 
        key.key_id.toLowerCase().includes(lowerCaseQuery) ||
        (key.user_email && key.user_email.toLowerCase().includes(lowerCaseQuery)) ||
        (key.hwid && key.hwid.toLowerCase().includes(lowerCaseQuery))
    );

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 sm:p-8 font-sans antialiased">
            <header className="flex items-center justify-between flex-wrap gap-4 mb-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Key className="text-indigo-600" />
                    HWID Key Manager
                </h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">{userEmail}</span>
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors flex items-center gap-2"
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">Your Keys ({filteredKeys.length})</h2>
                <button
                    onClick={() => setShowCreateKeyForm(!showCreateKeyForm)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-md"
                >
                    <Plus size={16} /> {showCreateKeyForm ? 'Cancel' : 'Create New Key'}
                </button>
            </div>

            <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search keys, HWIDs, or emails..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
            {showCreateKeyForm && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">New Key Details</h3>
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="flex-grow w-full">
                            <label htmlFor="keyDuration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration (in days)</label>
                            <input
                                id="keyDuration"
                                type="number"
                                value={newKeyDuration}
                                onChange={(e) => setNewKeyDuration(e.target.value)}
                                placeholder="e.g., 30, 90, 365"
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                        </div>
                        <button
                            onClick={createKey}
                            className="w-full sm:w-auto px-6 py-2 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 transition-colors shadow-sm"
                        >
                            Create Key
                        </button>
                    </div>
                    {keyCreationError && <p className="text-sm text-red-500 mt-2">{keyCreationError}</p>}
                </div>
            )}
            {filteredKeys.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredKeys.map((key) => (
                        <div key={key.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{key.key_id}</h3>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${key.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}`}>
                                    {key.status === 'active' ? 'Active' : 'Paused'}
                                </span>
                            </div>

                            <div className="space-y-3 mb-5">
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    <strong className="text-gray-800 dark:text-gray-100">HWID:</strong> {key.hwid || 'Not Assigned'}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    <strong className="text-gray-800 dark:text-gray-100">Duration:</strong> {key.duration} days
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    <strong className="text-gray-800 dark:text-gray-100">Expires:</strong> {key.expires_at ? new Date(key.expires_at.toDate()).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => handleToggleStatus(key)}
                                    className={`flex items-center gap-1 px-3 py-2 text-sm rounded-full transition-colors ${key.status === 'active' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                                >
                                    {key.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                                    {key.status === 'active' ? 'Pause' : 'Activate'}
                                </button>
                                <button
                                    onClick={() => handleResetHwid(key)}
                                    disabled={!key.hwid}
                                    className="flex items-center gap-1 px-3 py-2 text-sm rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RefreshCw size={16} /> Reset HWID
                                </button>
                                <button
                                    onClick={() => handleDeleteKey(key)}
                                    className="flex items-center gap-1 px-3 py-2 text-sm rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <Key className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No Keys Found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {searchQuery ? `No keys match your search for "${searchQuery}".` : 'Get started by creating your first HWID key.'}
                    </p>
                </div>
            )}

            {showModal && (
                <CustomModal
                    title="Confirm Action"
                    message={`Are you sure you want to ${modalTargetKey ? (modalTargetKey.hwid ? 'reset the HWID for key' : 'delete') : 'perform this action'}? This action is permanent.`}
                    onConfirm={modalAction}
                    onCancel={() => setShowModal(false)}
                />
            )}
        </div>
    );
};

if (!isAuthReady) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4 text-gray-800 dark:text-gray-100">Loading...</div>;
}

return (
    <div className="font-sans antialiased text-gray-900 dark:text-gray-100">
        {userId ? renderKeyManager() : renderAuthForm()}
    </div>
);