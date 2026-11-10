import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

export function getFirebaseApp() {
  const config = useRuntimeConfig().public
  if (!config.firebaseApiKey || !config.firebaseAuthDomain || !config.firebaseProjectId || !config.firebaseAppId) {
    throw new Error('Firebase web configuration is incomplete')
  }
  return getApps().length ? getApp() : initializeApp({
    apiKey: config.firebaseApiKey as string,
    authDomain: config.firebaseAuthDomain as string,
    projectId: config.firebaseProjectId as string,
    appId: config.firebaseAppId as string,
    storageBucket: config.firebaseStorageBucket as string,
    messagingSenderId: config.firebaseMessagingSenderId as string,
    measurementId: config.firebaseMeasurementId as string,
  })
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp())
}
