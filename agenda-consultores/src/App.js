import React, { useState, useMemo, useEffect } from "react";
import { initializeApp, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAnXDDMxEJjmDIDLPwO28MF9m1vTdK8Yn0",
  authDomain: "agenda-consultores-82678.firebaseapp.com",
  projectId: "agenda-consultores-82678",
  storageBucket: "agenda-consultores-82678.firebasestorage.app",
  messagingSenderId: "1093038644715",
  appId: "1:1093038644715:web:aa064decaa92713678cdae"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// App secundário para criar usuários sem deslogar o admin
function getSecondaryAuth() {
  try { initializeApp(firebaseConfig, "admin-ops"); } catch(e) {}
  return getAuth(getApp("admin-ops"));
}

// Helpers para salvar/carregar do Firestore
async function loadFromFirestore(key, fallback) {
  try {
    const snap = await getDoc(doc(db, "app_data", key));
    if (snap.exists()) return snap.data().value;
  } catch(e) { console.warn("Firestore load error:", e); }
  return fallback;
}
async function saveToFirestore(key, value) {
  try {
    await setDoc(doc(db, "app_data", key), { value });
  } catch(e) { console.warn("Firestore save error:", e); }
}

// Salvar entrada no histórico de alterações
async function saveHistorico(action, details) {
  try {
    await addDoc(collection(db, "historico"), {
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  } catch(e) { console.warn("Histórico save error:", e); }
}

// Buscar perfil do usuário no Firestore
async function getUserProfile(email) {
  try {
    const snap = await getDocs(collection(db, "usuarios"));
    for (const d of snap.docs) {
      if (d.data().email === email) return { id: d.id, ...d.data() };
    }
  } catch(e) { console.warn("Profile load error:", e); }
  return null;
}

const SCHEDULE_DATA = {"Antonio Matos":[{"month":"Setembro","day":1,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":8,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":19,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":3,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":5,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":26,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":1,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":8,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":5,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":7,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":12,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":14,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":19,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":21,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":26,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":28,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":2,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":25,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":25,"weekday":"Qua","client":"S","type":"holiday"},{"month":"Março","day":30,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":4,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":6,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":11,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"}],"Augusto Meirelles":[{"month":"Setembro","day":1,"weekday":"Seg","client":"TSM","type":"client"},{"month":"Setembro","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":4,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":5,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":8,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":11,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":12,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":19,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":25,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":26,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":2,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":3,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":24,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":28,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":30,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":31,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":3,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":4,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":5,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":6,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":7,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":14,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":21,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":25,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":26,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":27,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":28,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":1,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":4,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":5,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":8,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":9,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":11,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":12,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":19,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":5,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":6,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":7,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":8,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":9,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":12,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":13,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":14,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":15,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":16,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":19,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":20,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":21,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":22,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":23,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":26,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":27,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":28,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":29,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":30,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":2,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":3,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":6,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":25,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":27,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Março","day":2,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":5,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Março","day":9,"weekday":"Seg","client":"CABOVEL","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":12,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":13,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Março","day":16,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":19,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":20,"weekday":"Sex","client":"CABOVEL","type":"client"},{"month":"Março","day":23,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":25,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":27,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Março","day":30,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":21,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":24,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Abril","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":28,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":4,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":5,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":6,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":8,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Maio","day":11,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":12,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":14,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":15,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Maio","day":18,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":19,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":20,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":21,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":22,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Maio","day":25,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":26,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":27,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":28,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":29,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":4,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":5,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":8,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":11,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":12,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":15,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":16,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":18,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":19,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":24,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":25,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":26,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":29,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":30,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":1,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JULHO","day":2,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":3,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":7,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":8,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":9,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":10,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":14,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JULHO","day":16,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":17,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":22,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":23,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":24,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"JULHO","day":30,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":31,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":3,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":4,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":5,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":6,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":7,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":10,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":11,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":12,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"AGOSTO","day":13,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":14,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":17,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":18,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":19,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":20,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":21,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":24,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":25,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":26,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"AGOSTO","day":27,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":28,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":31,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":1,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":2,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":3,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":4,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":7,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":8,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":9,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"SETEMBRO","day":10,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":11,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":14,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":15,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":16,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":17,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":18,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":21,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":22,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":23,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"SETEMBRO","day":24,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":25,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":28,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":29,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":30,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":1,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":2,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":5,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":6,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":7,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"OUTUBRO","day":8,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":9,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":12,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":13,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":14,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":15,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":16,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":19,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":20,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":21,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"OUTUBRO","day":22,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":23,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":26,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":27,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":28,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":29,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":30,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":2,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"NOVEMBRO","day":5,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":6,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":10,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":11,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":12,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":13,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":16,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":17,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":18,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":19,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":20,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":25,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"NOVEMBRO","day":26,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":27,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":30,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":1,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":2,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":3,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":4,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":7,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":8,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":9,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":10,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":11,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":14,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":15,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":16,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":17,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":21,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":22,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":23,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":24,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"},{"month":"DEZEMBRO","day":28,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":29,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":30,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":31,"weekday":"Qui","client":"TIROLEZ","type":"client"}],"Celso Tarabori":[{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Abril","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":8,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"}],"Dalcione Carpenedo":[{"month":"Setembro","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"TSJC","type":"client"},{"month":"Setembro","day":4,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":5,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Setembro","day":8,"weekday":"Seg","client":"TSJC","type":"client"},{"month":"Setembro","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":11,"weekday":"Qui","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":12,"weekday":"Sex","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Setembro","day":19,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":25,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Setembro","day":26,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Setembro","day":29,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":30,"weekday":"Ter","client":"TSJC","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"TSJC","type":"client"},{"month":"Outubro","day":2,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Outubro","day":3,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Outubro","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"TSJC","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"TSJC","type":"client"},{"month":"Outubro","day":9,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Outubro","day":10,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Outubro","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":14,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":16,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Outubro","day":17,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"TSJC","type":"client"},{"month":"Outubro","day":23,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Outubro","day":24,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Outubro","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":30,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Outubro","day":31,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Novembro","day":3,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":4,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":5,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":6,"weekday":"Qua","client":"TSJC","type":"client"},{"month":"Novembro","day":7,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":14,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":21,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":25,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":26,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":27,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Novembro","day":28,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Dezembro","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":3,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":4,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Dezembro","day":5,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Dezembro","day":8,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":11,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Dezembro","day":12,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Dezembro","day":15,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":16,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":17,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":18,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Dezembro","day":19,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Dezembro","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Dezembro","day":29,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":30,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Janeiro","day":5,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":6,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":7,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":8,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Janeiro","day":9,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Janeiro","day":12,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":13,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":14,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":15,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Janeiro","day":16,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Janeiro","day":19,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":20,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":21,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":22,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Janeiro","day":23,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Janeiro","day":26,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":27,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":28,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":29,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Janeiro","day":30,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Fevereiro","day":2,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Fevereiro","day":6,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Fevereiro","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":11,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Fevereiro","day":16,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Fevereiro","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":25,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Fevereiro","day":27,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Março","day":2,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":4,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":5,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Março","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":11,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":12,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Março","day":13,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Março","day":16,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":18,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":19,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Março","day":20,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Março","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":25,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Março","day":27,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Março","day":30,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Abril","day":10,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Abril","day":17,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Abril","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Abril","day":24,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Abril","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Abril","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":29,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Maio","day":4,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":5,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":6,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Maio","day":8,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Maio","day":11,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":12,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":14,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Maio","day":15,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Maio","day":18,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":19,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":20,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":21,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Maio","day":22,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"Maio","day":25,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":26,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":27,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":28,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"Maio","day":29,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JUNHO","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":3,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":4,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JUNHO","day":5,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JUNHO","day":8,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":11,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JUNHO","day":12,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JUNHO","day":15,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":16,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":17,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":18,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JUNHO","day":19,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JUNHO","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":24,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":25,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JUNHO","day":26,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JUNHO","day":29,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":30,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":2,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JULHO","day":3,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JULHO","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":7,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":8,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":9,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JULHO","day":10,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JULHO","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":14,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":16,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JULHO","day":17,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JULHO","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":22,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":23,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JULHO","day":24,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"JULHO","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":29,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":30,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"JULHO","day":31,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"AGOSTO","day":3,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":4,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":5,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":6,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"AGOSTO","day":7,"weekday":"Sex","client":"TSUL","type":"client"},{"month":"AGOSTO","day":10,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":11,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":12,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":13,"weekday":"Qui","client":"TSJC","type":"client"},{"month":"AGOSTO","day":14,"weekday":"Sex","client":"TSUL","type":"client"}],"Dirce Matos":[{"month":"Setembro","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":4,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":9,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":11,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":19,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":25,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":28,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":4,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":5,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":6,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":25,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":26,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":4,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":9,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":11,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":5,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":6,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":7,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":8,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":9,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":12,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":13,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":14,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":15,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":16,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":20,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":21,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":22,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":27,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":28,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":29,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":3,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Março","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":18,"weekday":"Qua","client":"UNIMOL","type":"client"},{"month":"Março","day":19,"weekday":"Qui","client":"UNIMOL","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"UNIMOL","type":"client"},{"month":"Março","day":25,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"UNIMOL","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"UNIMOL","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"UNIMOL","type":"client"},{"month":"Abril","day":21,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"UNIMOL","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":28,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":5,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":20,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":27,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"}],"Hilton Vinhola":[{"month":"Setembro","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":4,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":11,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":12,"weekday":"Sex","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":25,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":29,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Setembro","day":30,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":2,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":9,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":14,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":16,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":23,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Outubro","day":30,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":3,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":4,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":5,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":6,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":25,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":26,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Novembro","day":27,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":3,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":4,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":8,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":11,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":15,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":16,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":17,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":18,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"FÉRIAS","type":"vacation"},{"month":"Dezembro","day":29,"weekday":"Seg","client":"FÉRIAS","type":"vacation"},{"month":"Dezembro","day":30,"weekday":"Ter","client":"FÉRIAS","type":"vacation"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"FÉRIAS","type":"vacation"},{"month":"Janeiro","day":5,"weekday":"Seg","client":"FÉRIAS","type":"vacation"},{"month":"Janeiro","day":6,"weekday":"Ter","client":"FÉRIAS","type":"vacation"},{"month":"Janeiro","day":7,"weekday":"Qua","client":"FÉRIAS","type":"vacation"},{"month":"Janeiro","day":8,"weekday":"Qui","client":"FÉRIAS","type":"vacation"},{"month":"Janeiro","day":9,"weekday":"Sex","client":"FÉRIAS","type":"vacation"},{"month":"Janeiro","day":12,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":13,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":14,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":15,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":19,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":20,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":21,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":22,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":26,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Janeiro","day":27,"weekday":"Ter","client":"TSM","type":"client"},{"month":"Janeiro","day":28,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":29,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":2,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Fevereiro","day":25,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":2,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":4,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Março","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":11,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":12,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":16,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Março","day":18,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Março","day":19,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Março","day":25,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Março","day":30,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Abril","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Abril","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Abril","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":4,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":5,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":6,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":11,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":12,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":14,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":18,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":19,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":20,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":21,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"Maio","day":25,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"Maio","day":26,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"Maio","day":27,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"Maio","day":28,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":1,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":2,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":3,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":4,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":8,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":9,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":10,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":11,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":15,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":16,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":17,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":18,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":22,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":23,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":24,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":25,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":29,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JUNHO","day":30,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":1,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":2,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":6,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":7,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":8,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":9,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":13,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":14,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":15,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":16,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":20,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":21,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":22,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":23,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":27,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":28,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":29,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"JULHO","day":30,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":3,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":4,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":5,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":6,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":10,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":11,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":12,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":13,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":17,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":18,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":19,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":20,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":24,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":25,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":26,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":27,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"AGOSTO","day":31,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":1,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":2,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":3,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":7,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":8,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":9,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":10,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":14,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":15,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":16,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":17,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":21,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":22,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":23,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":24,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":28,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":29,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"SETEMBRO","day":30,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":1,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":5,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":6,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":7,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":8,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":12,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":13,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":14,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":15,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":19,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":20,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":21,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":22,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":26,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":27,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":28,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"OUTUBRO","day":29,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":2,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":3,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":4,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":5,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":9,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":10,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":11,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":12,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":16,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":17,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":18,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":19,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":23,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":24,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":25,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":26,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"NOVEMBRO","day":30,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":1,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":2,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":3,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":7,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":8,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":9,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":10,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":14,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":15,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":16,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":17,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":21,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":22,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":23,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":24,"weekday":"Qui","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"},{"month":"DEZEMBRO","day":28,"weekday":"Seg","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":29,"weekday":"Ter","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":30,"weekday":"Qua","client":"TIROLEZ","type":"client"},{"month":"DEZEMBRO","day":31,"weekday":"Qui","client":"TIROLEZ","type":"client"}],"Lucas Cintra":[{"month":"Setembro","day":1,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":4,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":5,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":8,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":9,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":11,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":12,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":19,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Setembro","day":25,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Setembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Setembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Setembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":3,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":24,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Outubro","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Outubro","day":28,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Outubro","day":30,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Outubro","day":31,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":3,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":4,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":5,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":6,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":7,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":14,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":21,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":25,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":26,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":27,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":28,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":1,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":3,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":4,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":5,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":8,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":9,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":10,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":11,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":12,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":15,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":17,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":19,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":22,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":29,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":30,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":5,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":6,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":7,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":8,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":9,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":12,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":13,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":14,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":15,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":16,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":19,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":20,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":21,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":22,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":23,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":26,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":27,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":28,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":29,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":30,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":2,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":3,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":6,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":9,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":23,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":25,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":27,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":2,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Março","day":12,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Março","day":19,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":30,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":21,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":24,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":28,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":29,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":4,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":5,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":6,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":8,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Maio","day":11,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":12,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Maio","day":14,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":15,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Maio","day":19,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":21,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":26,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Maio","day":28,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":2,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":9,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":16,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":23,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"}],"Rodrigo Rodrigues":[{"month":"Setembro","day":1,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":3,"weekday":"Qua","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":4,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":5,"weekday":"Sex","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":8,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":9,"weekday":"Ter","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":10,"weekday":"Qua","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":11,"weekday":"Qui","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":12,"weekday":"Sex","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":15,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":16,"weekday":"Ter","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":17,"weekday":"Qua","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":18,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":19,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":22,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":23,"weekday":"Ter","client":"PARTICULAR","type":"client"},{"month":"Setembro","day":24,"weekday":"Qua","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":25,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":26,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":29,"weekday":"Seg","client":"RESERVADO","type":"reserved"},{"month":"Setembro","day":30,"weekday":"Ter","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":1,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":2,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":3,"weekday":"Sex","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":6,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":8,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":9,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":10,"weekday":"Sex","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":13,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":14,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":15,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":16,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":17,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":22,"weekday":"Qua","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":23,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":24,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":30,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":31,"weekday":"Sex","client":"RESERVADO","type":"reserved"},{"month":"Novembro","day":3,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"}],"Fabi RH":[{"month":"Setembro","day":29,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Setembro","day":30,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":1,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":2,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":3,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":6,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":7,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":8,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":9,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":10,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":13,"weekday":"Seg","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":14,"weekday":"Ter","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":15,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":16,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":17,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":20,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":21,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":22,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":23,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":24,"weekday":"Sex","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":27,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":28,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":29,"weekday":"Qua","client":"RESERVADO","type":"reserved"},{"month":"Outubro","day":30,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Outubro","day":31,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":3,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":4,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":6,"weekday":"Qua","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":7,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":14,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":21,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":24,"weekday":"Seg","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":25,"weekday":"Ter","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":27,"weekday":"Qui","client":"MAZZAFERRO","type":"client"},{"month":"Novembro","day":28,"weekday":"Sex","client":"MAZZAFERRO","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"}],"Marcelo Franco":[{"month":"Novembro","day":6,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":7,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":10,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":11,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":12,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":13,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":14,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":17,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Novembro","day":18,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Novembro","day":19,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Novembro","day":20,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":21,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Novembro","day":27,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Novembro","day":28,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":4,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":5,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":11,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":12,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":18,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":19,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":26,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":2,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":8,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":9,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":15,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":16,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":22,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":23,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":29,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Janeiro","day":30,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":6,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":27,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":2,"weekday":"Seg","client":"UNIMOL","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"UNIMOL","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"UNIMOL","type":"client"},{"month":"Março","day":9,"weekday":"Seg","client":"UNIMOL","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"UNIMOL","type":"client"},{"month":"Março","day":11,"weekday":"Qua","client":"UNIMOL","type":"client"},{"month":"Março","day":16,"weekday":"Seg","client":"UNIMOL","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"UNIMOL","type":"client"},{"month":"Março","day":23,"weekday":"Seg","client":"UNIMOL","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"UNIMOL","type":"client"},{"month":"Março","day":30,"weekday":"Seg","client":"UNIMOL","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"VEDACIT","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Abril","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Abril","day":24,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":8,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Maio","day":14,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Maio","day":15,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"DEZEMBRO","day":25,"weekday":"Sex","client":"Natal","type":"holiday"}],"Luciano Trigilio":[{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Fevereiro","day":2,"weekday":"Seg","client":"TEJOFRAN","type":"client"},{"month":"Fevereiro","day":3,"weekday":"Ter","client":"TEJOFRAN","type":"client"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"TEJOFRAN","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Fevereiro","day":6,"weekday":"Sex","client":"TEJOFRAN","type":"client"},{"month":"Fevereiro","day":9,"weekday":"Seg","client":"TEJOFRAN","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Fevereiro","day":11,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":16,"weekday":"Seg","client":"GHT4","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":18,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":23,"weekday":"Seg","client":"GHT4","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Fevereiro","day":25,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Fevereiro","day":27,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":2,"weekday":"Seg","client":"GHT4","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":4,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Março","day":5,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Março","day":6,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Março","day":9,"weekday":"Seg","client":"GHT4","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":11,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":12,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Março","day":13,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":16,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":18,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Março","day":19,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Março","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":23,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":25,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Março","day":27,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":30,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Abril","day":1,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"},{"month":"Abril","day":6,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":7,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Abril","day":8,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Abril","day":9,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Abril","day":10,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":13,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":14,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Abril","day":15,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Abril","day":16,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Abril","day":17,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":20,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":21,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Abril","day":22,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Abril","day":23,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Abril","day":24,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Abril","day":27,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Abril","day":28,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Abril","day":29,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Abril","day":30,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Maio","day":1,"weekday":"Sex","client":"Feraido Dia do Trabalho","type":"client"},{"month":"Maio","day":4,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":5,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Maio","day":6,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Maio","day":7,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Maio","day":8,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Maio","day":11,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":12,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Maio","day":13,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Maio","day":14,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Maio","day":15,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Maio","day":18,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":19,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Maio","day":20,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Maio","day":21,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Maio","day":22,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Maio","day":25,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Maio","day":26,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Maio","day":27,"weekday":"Qua","client":"GHT4","type":"client"},{"month":"Maio","day":28,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"Maio","day":29,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"JUNHO","day":4,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JUNHO","day":11,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JUNHO","day":18,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JUNHO","day":25,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JULHO","day":2,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JULHO","day":9,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JULHO","day":16,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JULHO","day":23,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"JULHO","day":30,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"AGOSTO","day":6,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"AGOSTO","day":13,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"AGOSTO","day":20,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"AGOSTO","day":27,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"SETEMBRO","day":3,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"SETEMBRO","day":10,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"SETEMBRO","day":17,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"SETEMBRO","day":24,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"OUTUBRO","day":1,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"OUTUBRO","day":8,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"OUTUBRO","day":15,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"OUTUBRO","day":22,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"OUTUBRO","day":29,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"NOVEMBRO","day":5,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"NOVEMBRO","day":12,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"NOVEMBRO","day":19,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"NOVEMBRO","day":26,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"DEZEMBRO","day":3,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"DEZEMBRO","day":10,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"DEZEMBRO","day":17,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"DEZEMBRO","day":24,"weekday":"Qui","client":"RESERVADO","type":"reserved"},{"month":"DEZEMBRO","day":31,"weekday":"Qui","client":"RESERVADO","type":"reserved"}],"Heverson Gomes":[{"month":"Fevereiro","day":3,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Fevereiro","day":6,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Fevereiro","day":10,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Fevereiro","day":12,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Fevereiro","day":13,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Fevereiro","day":17,"weekday":"Ter","client":"FERIADO CARNAVAL","type":"holiday"},{"month":"Fevereiro","day":19,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Fevereiro","day":20,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Fevereiro","day":24,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Fevereiro","day":27,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Março","day":3,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":5,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Março","day":10,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":12,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Março","day":13,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Março","day":17,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":19,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Março","day":20,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Março","day":24,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Março","day":27,"weekday":"Sex","client":"GHT4","type":"client"},{"month":"Março","day":31,"weekday":"Ter","client":"GHT4","type":"client"},{"month":"Abril","day":2,"weekday":"Qui","client":"GHT4","type":"client"},{"month":"Abril","day":3,"weekday":"Sex","client":"FERIADO SEXTA FEIRA SANTA","type":"holiday"}],"Thiago Berna":[{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Fevereiro","day":4,"weekday":"Qua","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":5,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Fevereiro","day":9,"weekday":"Seg","client":"MAZZA / VEDACIT","type":"client"},{"month":"Fevereiro","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"},{"month":"Março","day":6,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":9,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":13,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":16,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":20,"weekday":"Sex","client":"VEDACIT","type":"client"},{"month":"Março","day":23,"weekday":"Seg","client":"VEDACIT","type":"client"},{"month":"Março","day":26,"weekday":"Qui","client":"VEDACIT","type":"client"}],"Rodolfo Rosseto":[{"month":"Dezembro","day":24,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":25,"weekday":"Qui","client":"XXXX","type":"blocked"},{"month":"Dezembro","day":31,"weekday":"Qua","client":"XXXX","type":"blocked"},{"month":"Janeiro","day":1,"weekday":"Qui","client":"XXXX","type":"blocked"}]};


const MONTHS_ORDER = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const INITIAL_CLIENTS = ["VEDACIT","TIROLEZ","MAZZAFERRO","TSJC","TSUL","GHT4","UNIMOL","TEJOFRAN","TSM","TOYOBO","PARTICULAR","CABOVEL","GOBEAUTE"];
const CLIENT_COLORS = { VEDACIT:"#3b82f6",TIROLEZ:"#f59e0b",MAZZAFERRO:"#8b5cf6",TSJC:"#10b981",TSUL:"#06b6d4",GHT4:"#f97316",UNIMOL:"#ec4899",TEJOFRAN:"#6366f1",TSM:"#84cc16",TOYOBO:"#a855f7",PARTICULAR:"#64748b",CABOVEL:"#14b8a6",GOBEAUTE:"#f43f5e",RESERVADO:"#94a3b8",default:"#6b7280" };

function getClientColor(client) {
  if (!client) return "#e5e7eb";
  const key = Object.keys(CLIENT_COLORS).find(k => client.toUpperCase().includes(k));
  return key ? CLIENT_COLORS[key] : CLIENT_COLORS.default;
}
function getInitials(name) { return name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(); }
function formatDateTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }); }
  catch(e) { return iso; }
}

function normalizeClient(client) {
  if (!client) return "";
  return client.split("\n")[0].trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,10);
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function ensureIds(scheduleData) {
  const currentYear = new Date().getFullYear();
  const result = {};
  for (const [c, entries] of Object.entries(scheduleData||{})) {
    result[c] = (entries||[]).map(e => {
      let upd = e.id ? e : {...e, id: genId()};
      if (!upd.year) {
        // Inferir ano a partir de criadoEm, se disponível
        let inferredYear = currentYear;
        if (upd.criadoEm) {
          try { inferredYear = new Date(upd.criadoEm).getFullYear(); } catch(_) {}
        }
        upd = {...upd, year: inferredYear};
      }
      return upd;
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DE AGENDA (incluir/editar agendamentos)
// ─────────────────────────────────────────────────────────────────────────────
function AgendaModal({ consultores, clients, months, editEntry, onSave, onClose }) {
  const isPrefill = !!editEntry?.prefill; // clicked empty cell — new entry pre-filled with context
  const isEdit    = !!editEntry && !isPrefill; // editing an existing entry

  const [consultor, setConsultor] = useState(editEntry?.consultor || consultores[0] || "");
  const [month, setMonth] = useState(editEntry?.month || months[0] || "");
  const [year, setYear] = useState(editEntry?.year || new Date().getFullYear());
  const [client, setClient] = useState(editEntry?.client || "");
  const [type, setType] = useState(editEntry?.type || "client");
  const [horaInicio, setHoraInicio] = useState(editEntry?.horaInicio || "08:00");
  const [horaFim, setHoraFim] = useState(editEntry?.horaFim || "17:00");
  const [intervalo, setIntervalo] = useState(editEntry?.intervalo || "");
  const [atividades, setAtividades] = useState(editEntry?.atividades || "");
  const [dayMode, setDayMode] = useState("range");
  const [dayFrom, setDayFrom] = useState(editEntry?.day || 1);
  const [dayTo, setDayTo] = useState(editEntry?.day || 1);
  const [selectedDays, setSelectedDays] = useState(editEntry?.day ? [editEntry.day] : []);
  const [error, setError] = useState("");

  const toggleDay = (d) => setSelectedDays(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev,d].sort((a,b)=>a-b));

  const handleSave = () => {
    if (!consultor) { setError("Selecione um consultor."); return; }
    if (!client.trim() && type === "client") { setError("Informe o cliente."); return; }
    let days = [];
    if (isEdit) { days = [editEntry.day]; }
    else if (dayMode === "range") { for (let d=Number(dayFrom);d<=Number(dayTo);d++) days.push(d); }
    else { days = selectedDays; }
    if (days.length === 0) { setError("Selecione ao menos um dia."); return; }
    onSave({ id: editEntry?.id, consultor, month, year: Number(year), days, client: client.trim(), type, horaInicio, horaFim, intervalo, atividades: atividades.trim() });
  };

  const inp = { padding:"8px 12px", borderRadius:"8px", border:"1px solid #334155", background:"#0f172a", color:"#e2e8f0", fontSize:"13px", width:"100%", boxSizing:"border-box" };
  const lbl = { fontSize:"12px", color:"#64748b", fontWeight:600, marginBottom:"6px", display:"block" };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div style={{ background:"#1e293b",borderRadius:"16px",padding:"28px",width:"100%",maxWidth:"520px",border:"1px solid #334155",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"22px" }}>
          <div>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:"18px",fontWeight:700,color:"#f8fafc",margin:0 }}>{isEdit?"✏️ Editar Agenda":"➕ Nova Agenda"}</h2>
            {isPrefill && <p style={{ margin:"4px 0 0",fontSize:"12px",color:"#64748b" }}>📅 {editEntry.consultor.split(" ")[0]} · {editEntry.month} · Dia {editEntry.day}</p>}
          </div>
          <button onClick={onClose} style={{ background:"#334155",border:"none",color:"#94a3b8",borderRadius:"8px",width:"32px",height:"32px",cursor:"pointer",fontSize:"16px" }}>✕</button>
        </div>
        {error && <div style={{ background:"#ef444422",border:"1px solid #ef4444",borderRadius:"8px",padding:"10px 14px",color:"#ef4444",fontSize:"13px",marginBottom:"16px" }}>⚠️ {error}</div>}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 80px",gap:"16px",marginBottom:"16px" }}>
          <div><label style={lbl}>Consultor</label>
            <select value={consultor} onChange={e=>setConsultor(e.target.value)} style={{...inp, opacity:(isEdit||isPrefill)?0.6:1}} disabled={isEdit||isPrefill}>
              {consultores.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Mês</label>
            <select value={month} onChange={e=>setMonth(e.target.value)} style={{...inp, opacity:(isEdit||isPrefill)?0.6:1}} disabled={isEdit||isPrefill}>
              {months.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Ano</label>
            <select value={year} onChange={e=>setYear(e.target.value)} style={{...inp, opacity:(isEdit||isPrefill)?0.6:1}} disabled={isEdit||isPrefill}>
              {[new Date().getFullYear(), new Date().getFullYear()+1, new Date().getFullYear()+2].map(y=>(
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginBottom:"16px" }}>
          <label style={lbl}>Tipo de lançamento</label>
          <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
            {[["client","👤 Cliente"],["vacation","🏖 Férias"],["holiday","🎉 Feriado"],["reserved","🔒 Reservado"],["blocked","⛔ Bloqueado"]].map(([val,lab])=>(
              <button key={val} onClick={()=>setType(val)} style={{ padding:"6px 12px",borderRadius:"20px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,background:type===val?"#3b82f6":"#334155",color:type===val?"#fff":"#94a3b8" }}>{lab}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:"16px" }}>
          <label style={lbl}>Cliente / Descrição</label>
          <input list="clients-datalist" value={client} onChange={e=>setClient(e.target.value)}
            placeholder={type==="client"?"Selecione ou digite o cliente...":type==="vacation"?"Ex: FÉRIAS":type==="holiday"?"Nome do feriado":"Descrição..."} style={inp} autoFocus={isPrefill} />
          <datalist id="clients-datalist">{clients.map(c=><option key={c} value={c}/>)}</datalist>
        </div>
        {/* Horários */}
        <div style={{ marginBottom:"16px" }}>
          <label style={lbl}>⏰ Horário</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px" }}>
            <div>
              <label style={{...lbl, fontSize:"11px"}}>Início</label>
              <input type="time" value={horaInicio} onChange={e=>setHoraInicio(e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={{...lbl, fontSize:"11px"}}>Fim</label>
              <input type="time" value={horaFim} onChange={e=>setHoraFim(e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={{...lbl, fontSize:"11px"}}>Intervalo (min)</label>
              <input type="number" min="0" max="240" step="15" value={intervalo} onChange={e=>setIntervalo(e.target.value)} placeholder="Ex: 60" style={inp}/>
            </div>
          </div>
          {horaInicio && horaFim && horaInicio < horaFim && (
            <div style={{ fontSize:"11px", color:"#64748b", marginTop:"6px" }}>
              {(() => {
                const [hi,mi] = horaInicio.split(":").map(Number);
                const [hf,mf] = horaFim.split(":").map(Number);
                const total = (hf*60+mf) - (hi*60+mi) - (Number(intervalo)||0);
                const h = Math.floor(total/60), m = total%60;
                return `⏱ ${h}h${m>0?m+"min":""} úteis${intervalo?" (após intervalo de "+intervalo+"min)":""}`;
              })()}
            </div>
          )}
        </div>
        {/* Atividades */}
        <div style={{ marginBottom:"16px" }}>
          <label style={lbl}>📝 Atividades / Observações</label>
          <textarea
            value={atividades}
            onChange={e=>setAtividades(e.target.value)}
            placeholder="Descreva as atividades previstas para este agendamento..."
            rows={3}
            style={{...inp, resize:"vertical", minHeight:"72px", fontFamily:"inherit", lineHeight:"1.5"}}
          />
        </div>
        {/* Day selection: hidden when editing or prefill (day already locked) */}
        {!isEdit && !isPrefill && (
          <div style={{ marginBottom:"20px" }}>
            <label style={lbl}>Seleção de dias</label>
            <div style={{ display:"flex",gap:"8px",marginBottom:"12px" }}>
              <button onClick={()=>setDayMode("range")} style={{ padding:"6px 14px",borderRadius:"20px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,background:dayMode==="range"?"#6366f1":"#334155",color:dayMode==="range"?"#fff":"#94a3b8" }}>📅 Período</button>
              <button onClick={()=>setDayMode("individual")} style={{ padding:"6px 14px",borderRadius:"20px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,background:dayMode==="individual"?"#6366f1":"#334155",color:dayMode==="individual"?"#fff":"#94a3b8" }}>🔢 Individuais</button>
            </div>
            {dayMode==="range" ? (
              <div style={{ display:"flex",gap:"12px",alignItems:"flex-end" }}>
                <div style={{ flex:1 }}><label style={{...lbl,fontSize:"11px"}}>Dia inicial</label><input type="number" min="1" max="31" value={dayFrom} onChange={e=>setDayFrom(e.target.value)} style={inp}/></div>
                <div style={{ color:"#64748b",paddingBottom:"10px",fontSize:"18px" }}>→</div>
                <div style={{ flex:1 }}><label style={{...lbl,fontSize:"11px"}}>Dia final</label><input type="number" min="1" max="31" value={dayTo} onChange={e=>setDayTo(e.target.value)} style={inp}/></div>
                {dayFrom && dayTo && Number(dayFrom)<=Number(dayTo) && <div style={{ paddingBottom:"10px",color:"#22c55e",fontWeight:700,fontSize:"13px" }}>{Number(dayTo)-Number(dayFrom)+1}d</div>}
              </div>
            ) : (
              <div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px" }}>
                  {Array.from({length:31},(_,i)=>i+1).map(d=>(
                    <button key={d} onClick={()=>toggleDay(d)} style={{ padding:"6px 2px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:700,background:selectedDays.includes(d)?"#3b82f6":"#334155",color:selectedDays.includes(d)?"#fff":"#64748b" }}>{d}</button>
                  ))}
                </div>
                <p style={{ fontSize:"11px",color:"#64748b",margin:"8px 0 0" }}>{selectedDays.length} dia(s) selecionado(s)</p>
              </div>
            )}
          </div>
        )}
        {/* Show locked day info when editing or prefilling */}
        {(isEdit || isPrefill) && (
          <div style={{ marginBottom:"20px" }}>
            <label style={lbl}>Dia</label>
            <div style={{ display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:"#0f172a",borderRadius:"8px",border:"1px solid #334155" }}>
              <span style={{ fontSize:"20px" }}>📅</span>
              <div>
                <div style={{ fontSize:"14px",fontWeight:700,color:"#f1f5f9" }}>Dia {editEntry.day} de {editEntry.month}{editEntry.year ? " " + editEntry.year : ""}</div>
                <div style={{ fontSize:"11px",color:"#64748b",marginTop:"1px" }}>{editEntry.consultor}</div>
              </div>
            </div>
          </div>
        )}
        <div style={{ display:"flex",gap:"10px",justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"10px 20px",borderRadius:"8px",border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer",fontWeight:600,fontSize:"14px" }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding:"10px 24px",borderRadius:"8px",border:"none",background:"#3b82f6",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"14px" }}>{isEdit?"💾 Salvar":"✅ Adicionar"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO DE CADASTROS (Consultores, Clientes, Projetos)
// ─────────────────────────────────────────────────────────────────────────────
function CadastrosView({ consultores, clients, projects, onAddConsultor, onRemoveConsultor, onAddClient, onRemoveClient, onAddProject, onRemoveProject }) {
  const [tab, setTab] = useState("consultores");
  const [newConsultor, setNewConsultor] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newClientColor, setNewClientColor] = useState("#3b82f6");
  const [newProject, setNewProject] = useState({ name:"", client:"", description:"" });

  const inp = { padding:"8px 12px",borderRadius:"8px",border:"1px solid #334155",background:"#0f172a",color:"#e2e8f0",fontSize:"13px" };
  const card = { background:"#1e293b",borderRadius:"12px",padding:"20px",border:"1px solid #334155" };

  const tabs = [["consultores","👥 Consultores"],["clientes","🏢 Clientes"],["projetos","📋 Projetos"]];

  return (
    <div>
      <h2 style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:700,color:"#f8fafc",marginBottom:"20px" }}>🗂 Cadastros</h2>
      <div style={{ display:"flex",gap:"8px",marginBottom:"24px" }}>
        {tabs.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:"8px 20px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"13px",background:tab===id?"#3b82f6":"#1e293b",color:tab===id?"#fff":"#64748b" }}>{label}</button>
        ))}
      </div>

      {/* ─ CONSULTORES ─ */}
      {tab==="consultores" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px" }}>
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f1f5f9",marginTop:0,marginBottom:"16px" }}>➕ Novo Consultor</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
              <div>
                <label style={{ fontSize:"12px",color:"#64748b",fontWeight:600,display:"block",marginBottom:"6px" }}>Nome completo</label>
                <input value={newConsultor} onChange={e=>setNewConsultor(e.target.value)} placeholder="Ex: João Silva" style={{...inp,width:"100%",boxSizing:"border-box"}} />
              </div>
              <button onClick={()=>{ if(newConsultor.trim()){ onAddConsultor(newConsultor.trim()); setNewConsultor(""); }}} style={{ padding:"10px",borderRadius:"8px",border:"none",background:"#22c55e",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:"13px" }}>✅ Cadastrar Consultor</button>
            </div>
          </div>
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f1f5f9",marginTop:0,marginBottom:"16px" }}>👥 Consultores Cadastrados ({consultores.length})</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"8px",maxHeight:"300px",overflowY:"auto" }}>
              {consultores.map((c,i)=>(
                <div key={c} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"#0f172a",borderRadius:"8px",border:"1px solid #1e293b" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
                    <div style={{ width:"32px",height:"32px",borderRadius:"50%",background:"hsl("+(i*29%360)+",65%,50%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,color:"#fff" }}>{getInitials(c)}</div>
                    <span style={{ fontSize:"13px",color:"#e2e8f0",fontWeight:500 }}>{c}</span>
                  </div>
                  <button onClick={()=>{ if(window.confirm("Remover "+c+"? Todos os agendamentos serão perdidos.")) onRemoveConsultor(c); }} style={{ background:"#ef444422",border:"1px solid #ef444444",color:"#ef4444",borderRadius:"6px",padding:"4px 10px",cursor:"pointer",fontSize:"12px",fontWeight:600 }}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─ CLIENTES ─ */}
      {tab==="clientes" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px" }}>
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f1f5f9",marginTop:0,marginBottom:"16px" }}>➕ Novo Cliente</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
              <div>
                <label style={{ fontSize:"12px",color:"#64748b",fontWeight:600,display:"block",marginBottom:"6px" }}>Nome do cliente</label>
                <input value={newClient} onChange={e=>setNewClient(e.target.value.toUpperCase())} placeholder="Ex: EMPRESA SA" style={{...inp,width:"100%",boxSizing:"border-box"}} />
              </div>
              <div>
                <label style={{ fontSize:"12px",color:"#64748b",fontWeight:600,display:"block",marginBottom:"6px" }}>Cor identificadora</label>
                <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                  <input type="color" value={newClientColor} onChange={e=>setNewClientColor(e.target.value)} style={{ width:"48px",height:"36px",borderRadius:"8px",border:"1px solid #334155",background:"#0f172a",cursor:"pointer" }} />
                  <div style={{ flex:1,height:"36px",borderRadius:"8px",background:newClientColor,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <span style={{ fontSize:"12px",fontWeight:700,color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>{newClient||"PRÉVIA"}</span>
                  </div>
                </div>
              </div>
              <button onClick={()=>{ if(newClient.trim()){ onAddClient(newClient.trim(), newClientColor); setNewClient(""); }}} style={{ padding:"10px",borderRadius:"8px",border:"none",background:"#22c55e",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:"13px" }}>✅ Cadastrar Cliente</button>
            </div>
          </div>
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f1f5f9",marginTop:0,marginBottom:"16px" }}>🏢 Clientes Cadastrados ({clients.length})</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"8px",maxHeight:"300px",overflowY:"auto" }}>
              {clients.map(c=>(
                <div key={c.name} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"#0f172a",borderRadius:"8px",border:"1px solid #1e293b" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
                    <div style={{ width:"12px",height:"12px",borderRadius:"3px",background:c.color,flexShrink:0 }} />
                    <span style={{ fontSize:"13px",color:"#e2e8f0",fontWeight:600 }}>{c.name}</span>
                  </div>
                  <button onClick={()=>onRemoveClient(c.name)} style={{ background:"#ef444422",border:"1px solid #ef444444",color:"#ef4444",borderRadius:"6px",padding:"4px 10px",cursor:"pointer",fontSize:"12px",fontWeight:600 }}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─ PROJETOS ─ */}
      {tab==="projetos" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px" }}>
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f1f5f9",marginTop:0,marginBottom:"16px" }}>➕ Novo Projeto</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
              <div>
                <label style={{ fontSize:"12px",color:"#64748b",fontWeight:600,display:"block",marginBottom:"6px" }}>Nome do projeto</label>
                <input value={newProject.name} onChange={e=>setNewProject(p=>({...p,name:e.target.value}))} placeholder="Ex: Implantação Módulo Fiscal" style={{...inp,width:"100%",boxSizing:"border-box"}} />
              </div>
              <div>
                <label style={{ fontSize:"12px",color:"#64748b",fontWeight:600,display:"block",marginBottom:"6px" }}>Cliente</label>
                <select value={newProject.client} onChange={e=>setNewProject(p=>({...p,client:e.target.value}))} style={{...inp,width:"100%",boxSizing:"border-box"}}>
                  <option value="">Selecione o cliente...</option>
                  {clients.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:"12px",color:"#64748b",fontWeight:600,display:"block",marginBottom:"6px" }}>Descrição (opcional)</label>
                <input value={newProject.description} onChange={e=>setNewProject(p=>({...p,description:e.target.value}))} placeholder="Breve descrição do projeto..." style={{...inp,width:"100%",boxSizing:"border-box"}} />
              </div>
              <button onClick={()=>{ if(newProject.name.trim()&&newProject.client){ onAddProject({...newProject}); setNewProject({name:"",client:"",description:""}); }}} style={{ padding:"10px",borderRadius:"8px",border:"none",background:"#22c55e",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:"13px" }}>✅ Cadastrar Projeto</button>
            </div>
          </div>
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f1f5f9",marginTop:0,marginBottom:"16px" }}>📋 Projetos Cadastrados ({projects.length})</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"8px",maxHeight:"300px",overflowY:"auto" }}>
              {projects.length === 0 && <p style={{ color:"#475569",fontSize:"13px",textAlign:"center",padding:"20px" }}>Nenhum projeto cadastrado ainda.</p>}
              {projects.map((p,i)=>(
                <div key={i} style={{ padding:"10px 14px",background:"#0f172a",borderRadius:"8px",border:"1px solid #1e293b" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:"13px",color:"#f1f5f9",fontWeight:700 }}>{p.name}</div>
                      <div style={{ fontSize:"11px",color:getClientColor(p.client),fontWeight:600,marginTop:"2px" }}>{p.client}</div>
                      {p.description && <div style={{ fontSize:"11px",color:"#64748b",marginTop:"4px" }}>{p.description}</div>}
                    </div>
                    <button onClick={()=>onRemoveProject(i)} style={{ background:"#ef444422",border:"1px solid #ef444444",color:"#ef4444",borderRadius:"6px",padding:"4px 10px",cursor:"pointer",fontSize:"12px",fontWeight:600,flexShrink:0 }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDÁRIO MENSAL
// ─────────────────────────────────────────────────────────────────────────────
function CalendarioMensal({ data, selectedMonth, allMonths, consultores, clientColors, onEdit, onDelete, onNewEntry, readonly }) {
  const [calMes, setCalMes] = React.useState(selectedMonth !== "Todos" ? selectedMonth : allMonths[1] || "Setembro");
  const [calAno, setCalAno] = React.useState(new Date().getFullYear());
  const [popup, setPopup] = React.useState(null);
  const [selectedConsultores, setSelectedConsultores] = React.useState(new Set(consultores));
  const [showFilter, setShowFilter] = React.useState(false);
  const [showClientFilter, setShowClientFilter] = React.useState(false);
  const [selectedClients, setSelectedClients] = React.useState(new Set());

  const monthsAvail = allMonths.filter(m => m !== "Todos");
  const days = Array.from({length:31},(_,i)=>i+1);

  const lookup = {};
  for (const [name, entries] of Object.entries(data)) {
    lookup[name] = {};
    entries.filter(e=>e.month.toUpperCase()===calMes.toUpperCase() && e.year===calAno)
      .forEach(e=>{ if (!lookup[name][e.day]) lookup[name][e.day]=[]; lookup[name][e.day].push(e); });
  }

  // All unique clients present in this month
  const allClientsInMonth = React.useMemo(() => {
    const set = new Set();
    consultores.forEach(name => {
      (data[name]||[]).filter(e=>e.month.toUpperCase()===calMes.toUpperCase()&&e.year===calAno&&e.type==="client")
        .forEach(e => set.add(normalizeClient(e.client)));
    });
    return [...set].sort();
  }, [data, consultores, calMes]);

  // Init selectedClients when month changes or on first load
  React.useEffect(() => {
    setSelectedClients(new Set(allClientsInMonth));
  }, [calMes]);

  const toggleConsultor = (name) => {
    setSelectedConsultores(prev => {
      const next = new Set(prev);
      if (next.has(name)) { if (next.size > 1) next.delete(name); }
      else next.add(name);
      return next;
    });
  };
  const selectAllConsultores = () => setSelectedConsultores(new Set(consultores));
  const clearAllConsultores  = () => setSelectedConsultores(new Set([consultores[0]]));

  const toggleClient = (name) => {
    setSelectedClients(prev => {
      const next = new Set(prev);
      if (next.has(name)) { if (next.size > 1) next.delete(name); }
      else next.add(name);
      return next;
    });
  };
  const selectAllClients = () => setSelectedClients(new Set(allClientsInMonth));
  const clearAllClients  = () => setSelectedClients(new Set([allClientsInMonth[0]]));

  const clientFilterActive = selectedClients.size < allClientsInMonth.length;

  const allConsultoresWithData = consultores.filter(name=>(data[name]||[]).some(e=>e.month.toUpperCase()===calMes.toUpperCase()&&e.year===calAno));
  const activeConsultores = consultores.filter(name => selectedConsultores.has(name));

  // Map month name → approximate year/month for Date calculations
  const MONTH_MAP = { "janeiro":1,"fevereiro":2,"março":3,"abril":4,"maio":5,"junho":6,"julho":7,"agosto":8,"setembro":9,"outubro":10,"novembro":11,"dezembro":12 };
  const monthNum = MONTH_MAP[calMes.toLowerCase()] || 1;
  const guessYear = calAno;

  // How many days does this month actually have?
  const daysInMonth = new Date(guessYear, monthNum, 0).getDate();

  // Get weekday for each day (0=Sun,1=Mon,...,6=Sat)
  const getDayOfWeek = (d) => new Date(guessYear, monthNum - 1, d).getDay();
  const WEEKDAY_LABELS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];

  // All days 1..daysInMonth (no filtering — show every day of the month)
  const allDays = Array.from({length: daysInMonth}, (_, i) => i + 1);

  const getColor = (entry) => {
    if (!entry) return null;
    if (entry.type==="vacation") return "#22c55e";
    if (entry.type==="holiday") return "#ef4444";
    if (entry.type==="reserved") return "#94a3b8";
    if (entry.type==="blocked") return "#475569";
    const cname = normalizeClient(entry.client);
    return clientColors[cname] || getClientColor(entry.client);
  };

  const closeAll = () => { setPopup(null); setShowFilter(false); setShowClientFilter(false); };

  return (
    <div onClick={closeAll}>
      {/* MONTH SELECTOR */}
      <div style={{ display:"flex",alignItems:"center",gap:"16px",marginBottom:"16px",flexWrap:"wrap" }}>
        <h2 style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:700,color:"#f8fafc",margin:0 }}>📆 Calendário Mensal</h2>
        <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
          {monthsAvail.map(m=>(
            <button key={m} onClick={()=>setCalMes(m)} style={{ padding:"5px 12px",borderRadius:"16px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,background:calMes===m?"#3b82f6":"#1e293b",color:calMes===m?"#fff":"#64748b" }}>{m.slice(0,3)}</button>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"4px" }}>
          <button onClick={()=>setCalAno(a=>a-1)} style={{ padding:"4px 8px",borderRadius:"8px",border:"1px solid #334155",background:"#1e293b",color:"#94a3b8",cursor:"pointer",fontSize:"13px",fontWeight:700,lineHeight:1 }}>‹</button>
          <span style={{ padding:"4px 14px",borderRadius:"8px",background:"#1e293b",border:"1px solid #334155",fontSize:"13px",fontWeight:700,color:"#f1f5f9",minWidth:"62px",textAlign:"center" }}>{calAno}</span>
          <button onClick={()=>setCalAno(a=>a+1)} style={{ padding:"4px 8px",borderRadius:"8px",border:"1px solid #334155",background:"#1e293b",color:"#94a3b8",cursor:"pointer",fontSize:"13px",fontWeight:700,lineHeight:1 }}>›</button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ display:"flex",gap:"12px",marginBottom:"16px",flexWrap:"wrap",alignItems:"flex-start" }} onClick={e=>e.stopPropagation()}>

        {/* ── CONSULTOR FILTER ── */}
        <div style={{ position:"relative" }}>
          <button onClick={()=>{ setShowFilter(!showFilter); setShowClientFilter(false); }} style={{ padding:"7px 16px",borderRadius:"8px",border:"1px solid "+(showFilter?"#3b82f6":"#334155"),background:showFilter?"#1e3a5f":"#1e293b",color:showFilter?"#60a5fa":"#94a3b8",fontSize:"13px",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:"8px",whiteSpace:"nowrap" }}>
            👥 Consultores
            <span style={{ background:selectedConsultores.size<consultores.length?"#f59e0b":"#3b82f6",color:"#fff",borderRadius:"12px",padding:"1px 8px",fontSize:"11px",fontWeight:700 }}>{selectedConsultores.size}/{consultores.length}</span>
            <span style={{ fontSize:"10px" }}>{showFilter?"▲":"▼"}</span>
          </button>
          {showFilter && (
            <div style={{ position:"absolute",top:"calc(100% + 8px)",left:0,background:"#1e293b",border:"1px solid #334155",borderRadius:"12px",padding:"16px",zIndex:500,minWidth:"300px",maxWidth:"440px",boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
                <span style={{ fontSize:"13px",fontWeight:700,color:"#f1f5f9" }}>Filtrar consultores</span>
                <div style={{ display:"flex",gap:"6px" }}>
                  <button onClick={selectAllConsultores} style={{ padding:"4px 10px",borderRadius:"6px",border:"none",background:"#3b82f622",color:"#60a5fa",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>Todos</button>
                  <button onClick={clearAllConsultores} style={{ padding:"4px 10px",borderRadius:"6px",border:"none",background:"#33415522",color:"#94a3b8",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>Limpar</button>
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px" }}>
                {consultores.map((name,i)=>{
                  const isSelected = selectedConsultores.has(name);
                  const hasData = allConsultoresWithData.includes(name);
                  return (
                    <button key={name} onClick={()=>toggleConsultor(name)} style={{ display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",borderRadius:"8px",border:"1px solid "+(isSelected?"#3b82f6":"#334155"),background:isSelected?"#1e3a5f":"#0f172a",cursor:"pointer",textAlign:"left",opacity:hasData?1:0.45 }}>
                      <div style={{ width:"26px",height:"26px",borderRadius:"50%",background:"hsl("+(i*29%360)+",65%,"+(isSelected?"55%":"30%")+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:700,color:"#fff",flexShrink:0 }}>{getInitials(name)}</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:"12px",fontWeight:600,color:isSelected?"#f1f5f9":"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name.trim().split(" ")[0]}</div>
                        {!hasData && <div style={{ fontSize:"10px",color:"#475569" }}>sem dados</div>}
                      </div>
                      {isSelected && <span style={{ color:"#3b82f6",fontSize:"14px",flexShrink:0 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── CLIENT FILTER ── */}
        <div style={{ position:"relative" }}>
          <button onClick={()=>{ setShowClientFilter(!showClientFilter); setShowFilter(false); }} style={{ padding:"7px 16px",borderRadius:"8px",border:"1px solid "+(showClientFilter?"#f59e0b":clientFilterActive?"#f59e0b44":"#334155"),background:showClientFilter?"#1f1a0e":clientFilterActive?"#1f1a0e":"#1e293b",color:showClientFilter||clientFilterActive?"#f59e0b":"#94a3b8",fontSize:"13px",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:"8px",whiteSpace:"nowrap" }}>
            🏢 Clientes
            <span style={{ background:clientFilterActive?"#f59e0b":"#334155",color:clientFilterActive?"#000":"#64748b",borderRadius:"12px",padding:"1px 8px",fontSize:"11px",fontWeight:700 }}>{selectedClients.size}/{allClientsInMonth.length}</span>
            <span style={{ fontSize:"10px" }}>{showClientFilter?"▲":"▼"}</span>
          </button>
          {showClientFilter && (
            <div style={{ position:"absolute",top:"calc(100% + 8px)",left:0,background:"#1e293b",border:"1px solid #334155",borderRadius:"12px",padding:"16px",zIndex:500,minWidth:"280px",maxWidth:"400px",boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
                <span style={{ fontSize:"13px",fontWeight:700,color:"#f1f5f9" }}>Filtrar por cliente</span>
                <div style={{ display:"flex",gap:"6px" }}>
                  <button onClick={selectAllClients} style={{ padding:"4px 10px",borderRadius:"6px",border:"none",background:"#f59e0b22",color:"#f59e0b",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>Todos</button>
                  <button onClick={clearAllClients} style={{ padding:"4px 10px",borderRadius:"6px",border:"none",background:"#33415522",color:"#94a3b8",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>Limpar</button>
                </div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:"5px",maxHeight:"280px",overflowY:"auto" }}>
                {allClientsInMonth.length === 0 && <p style={{ color:"#475569",fontSize:"12px",textAlign:"center",padding:"12px 0" }}>Nenhum cliente neste mês</p>}
                {allClientsInMonth.map(clientName=>{
                  const isSelected = selectedClients.has(clientName);
                  const color = getClientColor(clientName);
                  return (
                    <button key={clientName} onClick={()=>toggleClient(clientName)} style={{ display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",borderRadius:"8px",border:"1px solid "+(isSelected?color+"66":"#334155"),background:isSelected?color+"18":"#0f172a",cursor:"pointer",textAlign:"left" }}>
                      <div style={{ width:"10px",height:"10px",borderRadius:"3px",background:isSelected?color:"#475569",flexShrink:0,transition:"background 0.2s" }}/>
                      <span style={{ fontSize:"13px",fontWeight:600,color:isSelected?color:"#64748b",flex:1 }}>{clientName}</span>
                      {isSelected && <span style={{ color:color,fontSize:"14px" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ACTIVE CLIENT PILLS */}
        <div style={{ display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center",flex:1 }}>
          {clientFilterActive && [...selectedClients].map(c=>{
            const color = getClientColor(c);
            return (
              <div key={c} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"4px 10px",borderRadius:"20px",background:color+"18",border:"1px solid "+color+"44",fontSize:"12px",fontWeight:600,color:color }}>
                <div style={{ width:"7px",height:"7px",borderRadius:"2px",background:color,flexShrink:0 }}/>
                {c}
                {selectedClients.size > 1 && (
                  <button onClick={()=>toggleClient(c)} style={{ background:"none",border:"none",color:color,cursor:"pointer",padding:"0",fontSize:"13px",lineHeight:1,marginLeft:"2px",opacity:0.7 }}>×</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* LEGEND */}
      <div style={{ display:"flex",gap:"16px",marginBottom:"12px",flexWrap:"wrap",alignItems:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"24px",height:"10px",borderRadius:"3px",background:"#1a2744" }}/><span style={{ fontSize:"11px",color:"#475569" }}>Fim de semana</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"10px",height:"10px",borderRadius:"3px",background:"#ef4444" }}/><span style={{ fontSize:"11px",color:"#475569" }}>Feriado</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"10px",height:"10px",borderRadius:"3px",background:"#22c55e" }}/><span style={{ fontSize:"11px",color:"#475569" }}>Férias</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"10px",height:"10px",borderRadius:"3px",background:"#94a3b8" }}/><span style={{ fontSize:"11px",color:"#475569" }}>Reservado</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"10px",height:"10px",borderRadius:"3px",background:"#475569" }}/><span style={{ fontSize:"11px",color:"#475569" }}>Bloqueado</span></div>
      </div>

      {/* TABLE */}
      <div style={{ overflowX:"auto",borderRadius:"12px",border:"1px solid #334155" }}>
        <table style={{ borderCollapse:"collapse",width:"100%",minWidth:(daysInMonth*34+160)+"px" }}>
          <thead>
            {/* Weekday row */}
            <tr style={{ background:"#1e293b" }}>
              <th style={{ padding:"8px 16px",textAlign:"left",fontSize:"11px",fontWeight:700,color:"#64748b",position:"sticky",left:0,background:"#1e293b",zIndex:2,minWidth:"150px",borderBottom:"1px solid #0f172a" }}>Consultor</th>
              {allDays.map(d=>{
                const dow = getDayOfWeek(d);
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <th key={d} style={{ padding:"3px 2px",textAlign:"center",fontSize:"9px",fontWeight:600,color:isWeekend?"#475569":"#64748b",minWidth:"34px",maxWidth:"34px",background:isWeekend?"#0d1a30":"#1e293b",borderBottom:"1px solid #0f172a",borderLeft:"1px solid #0f172a" }}>
                    {WEEKDAY_LABELS[dow]}
                  </th>
                );
              })}
            </tr>
            {/* Day number row */}
            <tr style={{ background:"#1e293b" }}>
              <th style={{ padding:"4px 16px",position:"sticky",left:0,background:"#1e293b",zIndex:2,borderBottom:"1px solid #334155" }}></th>
              {allDays.map(d=>{
                const dow = getDayOfWeek(d);
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <th key={d} style={{ padding:"4px 2px",textAlign:"center",fontSize:"11px",fontWeight:700,color:isWeekend?"#374151":"#94a3b8",minWidth:"34px",background:isWeekend?"#0d1a30":"#1e293b",borderBottom:"1px solid #334155",borderLeft:"1px solid #0f172a" }}>{d}</th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeConsultores.map((name)=>(
              <tr key={name} style={{ borderTop:"1px solid #1e293b" }}>
                <td style={{ padding:"6px 16px",fontSize:"12px",fontWeight:600,color:"#cbd5e1",position:"sticky",left:0,background:"#0f172a",zIndex:1,whiteSpace:"nowrap",borderRight:"1px solid #334155" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                    <div style={{ width:"22px",height:"22px",borderRadius:"50%",background:"hsl("+(consultores.indexOf(name)*29%360)+",65%,50%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:700,color:"#fff",flexShrink:0 }}>{getInitials(name)}</div>
                    {name.trim().split(" ").slice(0,2).join(" ")}
                  </div>
                </td>
                {allDays.map(d=>{
                  const dow = getDayOfWeek(d);
                  const isWeekend = dow === 0 || dow === 6;
                  const entry = lookup[name]?.[d];
                  const colBg = isWeekend ? "#0d1a30" : "#0f172a";

                  const dayEntries = lookup[name]?.[d] || [];
                  if (dayEntries.length === 0) return (
                    <td key={d} style={{ padding:"3px",borderLeft:"1px solid #1e293b",background:colBg }}
                      onClick={e=>{ if(readonly) return; e.stopPropagation(); onNewEntry({ consultor:name, month:calMes, day:d }); }}>
                      <div style={{ width:"28px",height:"28px",borderRadius:"4px",background:"transparent",border:"1px dashed transparent",margin:"0 auto",cursor:readonly?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s" }}
                        onMouseEnter={e=>{ if(readonly) return; e.currentTarget.style.background="#22c55e18"; e.currentTarget.style.borderColor="#22c55e55"; e.currentTarget.querySelector("span").style.opacity="1"; }}
                        onMouseLeave={e=>{ if(readonly) return; e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="transparent"; e.currentTarget.querySelector("span").style.opacity="0"; }}>
                        <span style={{ fontSize:"13px",opacity:0,transition:"opacity 0.15s",userSelect:"none",color:"#22c55e" }}>＋</span>
                      </div>
                    </td>
                  );
                  const allFiltered = dayEntries.every(e=>e.type==="client"&&clientFilterActive&&!selectedClients.has(normalizeClient(e.client)));
                  return (
                    <td key={d} style={{ padding:"2px",borderLeft:"1px solid #1e293b",background:colBg,verticalAlign:"top" }} onClick={e=>{e.stopPropagation();if(!allFiltered)setPopup({name,day:d,entries:dayEntries,x:e.clientX,y:e.clientY});}}>
                      <div style={{ width:"28px",minHeight:"28px",borderRadius:"4px",overflow:"hidden",margin:"0 auto",cursor:allFiltered?"default":"pointer",display:"flex",flexDirection:"column",gap:"1px" }}>
                        {dayEntries.slice(0,3).map((entry,ei)=>{
                          const color=getColor(entry);
                          const label=entry.type==="vacation"?"FÉR":entry.type==="holiday"?"FER":entry.type==="blocked"?"BLQ":entry.type==="reserved"?"RES":normalizeClient(entry.client).slice(0,3);
                          const filtered=entry.type==="client"&&clientFilterActive&&!selectedClients.has(normalizeClient(entry.client));
                          return (
                            <div key={entry.id||ei} style={{ flex:1,background:filtered?"#1e293b":color,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"8px",opacity:filtered?0.2:1 }}>
                              {!filtered&&dayEntries.length<=2&&<span style={{ fontSize:"6px",fontWeight:800,color:"#fff",letterSpacing:"-0.5px" }}>{label}</span>}
                            </div>
                          );
                        })}
                        {dayEntries.length>3&&<div style={{ background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",minHeight:"7px" }}><span style={{ fontSize:"6px",color:"#94a3b8",fontWeight:700 }}>+{dayEntries.length-3}</span></div>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize:"11px",color:"#475569",marginTop:"8px" }}>💡 Clique em célula colorida para editar/excluir · Clique em célula vazia para adicionar agenda · Colunas escuras = fim de semana</p>
      {popup && (
        <div onClick={e=>e.stopPropagation()} style={{ position:"fixed",left:Math.min(popup.x,window.innerWidth-290)+"px",top:Math.min(popup.y+8,window.innerHeight-320)+"px",background:"#1e293b",border:"1px solid #475569",borderRadius:"12px",padding:"16px",zIndex:9000,width:"280px",boxShadow:"0 8px 32px rgba(0,0,0,0.6)",maxHeight:"80vh",overflowY:"auto" }}>
          {/* Header */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px" }}>
            <div>
              <div style={{ fontSize:"13px",fontWeight:700,color:"#f1f5f9" }}>{popup.name.trim().split(" ")[0]}</div>
              <div style={{ fontSize:"11px",color:"#64748b" }}>Dia {popup.day} · {calMes} {calAno} ({WEEKDAY_LABELS[getDayOfWeek(popup.day)]})</div>
            </div>
            {!readonly && <button onClick={()=>{ onNewEntry({consultor:popup.name,month:calMes,day:popup.day}); setPopup(null); }} style={{ padding:"4px 8px",borderRadius:"6px",border:"1px solid #22c55e44",background:"#22c55e18",color:"#22c55e",fontSize:"11px",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>＋ Novo</button>}
          </div>
          {/* Entry list */}
          <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
            {(popup.entries||[]).map((entry,ei)=>{
              const color = getColor(entry);
              const TYPE_LABEL = {client:"👤 Cliente",vacation:"🏖 Férias",holiday:"🎉 Feriado",reserved:"🔒 Reservado",blocked:"⛔ Bloqueado"};
              return (
                <div key={entry.id||ei} style={{ background:"#0f172a",borderRadius:"8px",border:"1px solid #334155",overflow:"hidden" }}>
                  {/* Entry header bar */}
                  <div style={{ background:color,padding:"4px 10px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <span style={{ fontSize:"11px",fontWeight:800,color:"#fff",letterSpacing:"0.3px" }}>{entry.client||TYPE_LABEL[entry.type]||entry.type}</span>
                    {(entry.horaInicio||entry.horaFim) && <span style={{ fontSize:"10px",color:"rgba(255,255,255,0.85)",fontWeight:600 }}>{entry.horaInicio||""}{entry.horaFim?" → "+entry.horaFim:""}{entry.intervalo?" ☕"+entry.intervalo+"m":""}</span>}
                  </div>
                  {entry.atividades && (
                    <div style={{ padding:"6px 10px 0",fontSize:"11px",color:"#94a3b8",lineHeight:"1.5",whiteSpace:"pre-wrap",borderBottom:"1px solid #1e293b" }}>{entry.atividades}</div>
                  )}
                  {/* History */}
                  <div style={{ padding:"8px 10px" }}>
                    {(entry.historico||[]).length>0 ? (
                      <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
                        {entry.historico.map((h,hi)=>(
                          <div key={hi} style={{ fontSize:"10px",color:"#64748b" }}>
                            <span style={{ color:h.acao==="criado"?"#22c55e":h.acao==="alterado"?"#f59e0b":"#ef4444",marginRight:"4px" }}>{h.acao==="criado"?"＋":h.acao==="alterado"?"✎":"✕"}</span>
                            <span style={{ color:"#94a3b8",fontWeight:600 }}>{h.por}</span>
                            <span style={{ color:"#475569" }}> · {formatDateTime(h.em)}</span>
                            {h.alteracoes&&h.alteracoes.length>0&&(
                              <div style={{ marginTop:"2px",paddingLeft:"14px" }}>
                                {h.alteracoes.map((a,ai)=>(
                                  <div key={ai} style={{ fontSize:"9px",color:"#64748b" }}>
                                    <span style={{ color:"#94a3b8" }}>{a.campo}:</span> <span style={{ textDecoration:"line-through",color:"#ef444488" }}>{a.de}</span> → <span style={{ color:"#22c55e" }}>{a.para}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize:"10px",color:"#475569",fontStyle:"italic" }}>Sem histórico</span>
                    )}
                    {/* Actions */}
                    {!readonly && (
                      <div style={{ display:"flex",gap:"6px",marginTop:"8px" }}>
                        <button onClick={()=>{ onEdit({...entry,consultor:popup.name,month:calMes}); setPopup(null); }} style={{ flex:1,padding:"5px",borderRadius:"5px",border:"none",background:"#3b82f6",color:"#fff",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>✏️ Editar</button>
                        <button onClick={()=>{ onDelete(popup.name,entry.id); setPopup(null); }} style={{ padding:"5px 10px",borderRadius:"5px",border:"1px solid #ef4444",background:"transparent",color:"#ef4444",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>🗑</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTOR CARD
// ─────────────────────────────────────────────────────────────────────────────
function ConsultorCard({ name, entries, idx, onClick, selected }) {
  const clientEntries = entries.filter(e=>e.type==="client");
  const clientCounts = {};
  clientEntries.forEach(e=>{ const k=normalizeClient(e.client); clientCounts[k]=(clientCounts[k]||0)+1; });
  const topClients = Object.entries(clientCounts).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const total = clientEntries.length;
  const vacation = entries.filter(e=>e.type==="vacation").length;
  return (
    <div onClick={onClick} style={{ background:selected?"#1e3a5f":"#1e293b",border:"1px solid "+(selected?"#3b82f6":"#334155"),borderRadius:"12px",padding:"20px",cursor:"pointer",transition:"all 0.2s" }}>
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px" }}>
        <div style={{ width:"42px",height:"42px",borderRadius:"50%",background:"hsl("+(idx*29%360)+",65%,50%)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"14px",color:"#fff",flexShrink:0 }}>{getInitials(name)}</div>
        <div>
          <div style={{ fontWeight:600,fontSize:"15px",color:"#f1f5f9" }}>{name.trim()}</div>
          <div style={{ fontSize:"12px",color:"#64748b" }}>{total} dias{vacation>0?" · "+vacation+" férias":""}</div>
        </div>
      </div>
      {topClients.length>0 && (
        <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
          {topClients.map(([client,count])=>{
            const pct = Math.round((count/total)*100);
            const color = getClientColor(client);
            return (
              <div key={client}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"3px" }}>
                  <span style={{ fontSize:"11px",color:"#94a3b8",fontWeight:500 }}>{client}</span>
                  <span style={{ fontSize:"11px",color:"#64748b" }}>{count}d · {pct}%</span>
                </div>
                <div style={{ height:"5px",background:"#334155",borderRadius:"3px",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:pct+"%",background:color,borderRadius:"3px" }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR VIEW (single consultant)
// ─────────────────────────────────────────────────────────────────────────────
function CalendarView({ consultant, month, byDay }) {
  const days = Array.from({length:31},(_,i)=>i+1);
  const wd = ["Seg","Ter","Qua","Qui","Sex","Sab","Dom"];
  return (
    <div>
      <h2 style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:700,color:"#f8fafc",marginBottom:"20px" }}>📅 {consultant} — {month}</h2>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"6px" }}>
        {wd.map(d=><div key={d} style={{ textAlign:"center",fontSize:"11px",fontWeight:700,color:"#64748b",padding:"8px 0" }}>{d}</div>)}
        {days.map(d=>{
          const entry = byDay[d];
          if (!entry) return <div key={d} style={{ minHeight:"64px",borderRadius:"8px",background:"#1e293b33" }}/>;
          const color = entry.type==="vacation"?"#22c55e":entry.type==="holiday"?"#ef4444":entry.type==="reserved"?"#94a3b8":entry.type==="blocked"?"#475569":getClientColor(entry.client);
          return (
            <div key={d} style={{ minHeight:"64px",borderRadius:"8px",background:color+"22",border:"1px solid "+color+"44",padding:"6px" }}>
              <div style={{ fontSize:"11px",fontWeight:700,color:"#94a3b8",marginBottom:"2px" }}>{d}</div>
              <div style={{ fontSize:"9px",fontWeight:600,color:color,lineHeight:1.3,wordBreak:"break-word" }}>{entry.client.split("\n")[0].slice(0,12)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE VIEW
// ─────────────────────────────────────────────────────────────────────────────
function TimelineView({ data, months }) {
  const consultores = Object.keys(data).filter(c=>data[c].length>0);
  const displayMonths = months.slice(0,12);
  const getMonthSummary = (name,month) => {
    const entries = (data[name]||[]).filter(e=>e.month.toUpperCase()===month.toUpperCase());
    const byClient = {};
    entries.filter(e=>e.type==="client").forEach(e=>{ const k=normalizeClient(e.client); byClient[k]=(byClient[k]||0)+1; });
    const top = Object.entries(byClient).sort((a,b)=>b[1]-a[1])[0];
    return { total:Object.values(byClient).reduce((s,v)=>s+v,0), top, vacation:entries.filter(e=>e.type==="vacation").length };
  };
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ borderCollapse:"collapse",minWidth:"900px",width:"100%" }}>
        <thead>
          <tr>
            <th style={{ padding:"10px 16px",textAlign:"left",fontSize:"12px",fontWeight:700,color:"#64748b",position:"sticky",left:0,background:"#0f172a",zIndex:1 }}>Consultor</th>
            {displayMonths.map(m=><th key={m} style={{ padding:"10px 8px",textAlign:"center",fontSize:"11px",fontWeight:600,color:"#64748b",minWidth:"80px" }}>{m.slice(0,3)}</th>)}
          </tr>
        </thead>
        <tbody>
          {consultores.map((name,idx)=>(
            <tr key={name} style={{ borderTop:"1px solid #1e293b" }}>
              <td style={{ padding:"10px 16px",fontSize:"13px",fontWeight:600,color:"#cbd5e1",position:"sticky",left:0,background:"#0f172a",zIndex:1,whiteSpace:"nowrap" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                  <div style={{ width:"28px",height:"28px",borderRadius:"50%",background:"hsl("+(idx*29%360)+",65%,50%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:700,color:"#fff",flexShrink:0 }}>{getInitials(name)}</div>
                  {name.trim().split(" ").slice(0,2).join(" ")}
                </div>
              </td>
              {displayMonths.map(m=>{
                const {total,top,vacation} = getMonthSummary(name,m);
                if (vacation>0&&total===0) return <td key={m} style={{ padding:"4px" }}><div style={{ background:"#22c55e22",border:"1px solid #22c55e44",borderRadius:"6px",padding:"6px 4px",textAlign:"center" }}><div style={{ fontSize:"10px",color:"#22c55e",fontWeight:600 }}>FÉRIAS</div></div></td>;
                if (!total) return <td key={m} style={{ padding:"4px" }}><div style={{ height:"36px",borderRadius:"6px",background:"#1e293b44" }}/></td>;
                const color = top ? getClientColor(top[0]) : "#3b82f6";
                return <td key={m} style={{ padding:"4px" }}><div style={{ background:color+"22",border:"1px solid "+color+"44",borderRadius:"6px",padding:"6px 4px",textAlign:"center" }}><div style={{ fontSize:"9px",color:color,fontWeight:700,lineHeight:1.2 }}>{top?.[0]?.slice(0,7)||""}</div><div style={{ fontSize:"10px",color:"#64748b",marginTop:"1px" }}>{total}d</div></div></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function StatsView({ stats }) {
  const maxDays = Math.max(...stats.consultorStats.map(c=>c.working),1);
  return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px" }}>
      <div style={{ background:"#1e293b",borderRadius:"12px",padding:"24px",border:"1px solid #334155" }}>
        <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:"15px",fontWeight:700,color:"#f8fafc",marginTop:0,marginBottom:"20px" }}>🏆 Top Clientes por Dias</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
          {stats.topClients.map(([client,days],i)=>{
            const color = getClientColor(client);
            const pct = Math.round((days/(stats.topClients[0]?.[1]||1))*100);
            return (
              <div key={client}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}>
                  <span style={{ fontSize:"13px",color:"#cbd5e1",fontWeight:500 }}><span style={{ color:"#64748b",marginRight:"8px" }}>#{i+1}</span>{client}</span>
                  <span style={{ fontSize:"13px",color:color,fontWeight:700 }}>{days} dias</span>
                </div>
                <div style={{ height:"6px",background:"#334155",borderRadius:"3px",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:pct+"%",background:color,borderRadius:"3px" }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background:"#1e293b",borderRadius:"12px",padding:"24px",border:"1px solid #334155" }}>
        <h3 style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:"15px",fontWeight:700,color:"#f8fafc",marginTop:0,marginBottom:"20px" }}>👥 Produtividade por Consultor</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
          {stats.consultorStats.filter(c=>c.working>0).map((c,i)=>{
            const pct = Math.round((c.working/maxDays)*100);
            const hue = (i*37)%360;
            return (
              <div key={c.name}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"3px" }}>
                  <span style={{ fontSize:"12px",color:"#cbd5e1" }}>{c.name.trim().split(" ").slice(0,2).join(" ")}</span>
                  <div style={{ display:"flex",gap:"8px" }}>
                    <span style={{ fontSize:"12px",color:"#94a3b8" }}>{c.working}d</span>
                    {c.vacation>0&&<span style={{ fontSize:"12px",color:"#22c55e" }}>🏖 {c.vacation}d</span>}
                  </div>
                </div>
                <div style={{ height:"5px",background:"#334155",borderRadius:"3px",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:pct+"%",background:"hsl("+hue+",65%,55%)",borderRadius:"3px" }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_BADGES = {
  admin:     { label:"Admin",         color:"#a855f7", bg:"#a855f718" },
  editor:    { label:"Editor",        color:"#3b82f6", bg:"#3b82f618" },
  viewer:    { label:"Visualizador",  color:"#64748b", bg:"#64748b18" },
  consultor: { label:"Consultor",     color:"#f59e0b", bg:"#f59e0b18" },
};

// ─────────────────────────────────────────────────────────────────────────────
// TELA DE LOGIN (Firebase Auth)
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError("Preencha e-mail e senha."); return; }
    setLoading(true); setError("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const profile = await getUserProfile(cred.user.email);
      if (!profile) { setError("Usuário sem perfil configurado. Contate o administrador."); setLoading(false); return; }
      onLogin({ uid: cred.user.uid, email: cred.user.email, ...profile });
    } catch(e) {
      const msgs = { "auth/invalid-credential":"E-mail ou senha incorretos.", "auth/user-not-found":"E-mail não encontrado.", "auth/wrong-password":"Senha incorreta.", "auth/too-many-requests":"Muitas tentativas. Aguarde alguns minutos." };
      setError(msgs[e.code] || "Erro ao fazer login. Tente novamente.");
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!resetEmail.trim()) { setResetMsg("⚠️ Digite seu e-mail."); return; }
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetMsg("✅ E-mail de recuperação enviado! Verifique sua caixa de entrada.");
    } catch(e) {
      setResetMsg("⚠️ E-mail não encontrado ou erro ao enviar.");
    }
  };

  const inp = { padding:"11px 14px", borderRadius:"8px", border:"1px solid #334155", background:"#0f172a", color:"#e2e8f0", fontSize:"14px", width:"100%", boxSizing:"border-box", outline:"none" };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#0f172a", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet"/>
      <div style={{ width:"100%", maxWidth:"420px" }}>
        <div style={{ textAlign:"center", marginBottom:"40px" }}>
          <div style={{ fontSize:"48px", marginBottom:"16px" }}>📅</div>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:"26px", fontWeight:700, color:"#f8fafc", margin:"0 0 6px" }}>Agenda de Consultores</h1>
          <p style={{ color:"#475569", fontSize:"14px", margin:0 }}>Faça login para continuar</p>
        </div>

        {!showReset ? (
          <div style={{ background:"#1e293b", borderRadius:"16px", padding:"32px", border:"1px solid #334155", boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
              <div>
                <label style={{ fontSize:"12px", color:"#64748b", fontWeight:600, display:"block", marginBottom:"6px" }}>E-mail</label>
                <input type="email" value={email} onChange={e=>{ setEmail(e.target.value); setError(""); }} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="seu@email.com" style={inp} autoFocus />
              </div>
              <div>
                <label style={{ fontSize:"12px", color:"#64748b", fontWeight:600, display:"block", marginBottom:"6px" }}>Senha</label>
                <div style={{ position:"relative" }}>
                  <input type={showPass?"text":"password"} value={password} onChange={e=>{ setPassword(e.target.value); setError(""); }} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="Digite sua senha..." style={{...inp, paddingRight:"44px"}} />
                  <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:"16px", padding:"0" }}>{showPass?"🙈":"👁"}</button>
                </div>
              </div>
              {error && <div style={{ padding:"10px 14px", borderRadius:"8px", background:"#ef444422", border:"1px solid #ef444444", color:"#ef4444", fontSize:"13px" }}>⚠️ {error}</div>}
              <button onClick={handleSubmit} disabled={loading} style={{ padding:"12px", borderRadius:"8px", border:"none", background:loading?"#334155":"#3b82f6", color:loading?"#64748b":"#fff", fontWeight:700, fontSize:"15px", cursor:loading?"not-allowed":"pointer", transition:"background 0.2s" }}>
                {loading ? "Verificando..." : "Entrar →"}
              </button>
              <button onClick={()=>{ setShowReset(true); setResetEmail(email); }} style={{ background:"none", border:"none", color:"#64748b", fontSize:"13px", cursor:"pointer", textDecoration:"underline", padding:0, textAlign:"center" }}>
                Esqueci minha senha
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background:"#1e293b", borderRadius:"16px", padding:"32px", border:"1px solid #334155", boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:"18px", fontWeight:700, color:"#f8fafc", marginTop:0, marginBottom:"8px" }}>🔑 Recuperar senha</h2>
            <p style={{ fontSize:"13px", color:"#64748b", marginBottom:"20px" }}>Digite seu e-mail e enviaremos um link para redefinir sua senha.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
              <input type="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} placeholder="seu@email.com" style={inp} autoFocus />
              {resetMsg && <div style={{ padding:"10px 14px", borderRadius:"8px", background:resetMsg.startsWith("✅")?"#22c55e22":"#ef444422", border:"1px solid "+(resetMsg.startsWith("✅")?"#22c55e44":"#ef444444"), color:resetMsg.startsWith("✅")?"#22c55e":"#ef4444", fontSize:"13px" }}>{resetMsg}</div>}
              <button onClick={handleReset} style={{ padding:"12px", borderRadius:"8px", border:"none", background:"#3b82f6", color:"#fff", fontWeight:700, fontSize:"14px", cursor:"pointer" }}>
                📧 Enviar e-mail de recuperação
              </button>
              <button onClick={()=>{ setShowReset(false); setResetMsg(""); }} style={{ background:"none", border:"none", color:"#64748b", fontSize:"13px", cursor:"pointer", textDecoration:"underline", padding:0, textAlign:"center" }}>
                ← Voltar ao login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TELA DE GERENCIAR USUÁRIOS (apenas admin)
// ─────────────────────────────────────────────────────────────────────────────
function GerenciarUsuarios({ consultores, onAddConsultor, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoRole, setNovoRole] = useState("viewer");
  const [novoConsultor, setNovoConsultor] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "usuarios"));
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    load();
  }, []);

  const handleAdd = async () => {
    if (!novoEmail.trim() || !novoNome.trim()) { setError("Preencha nome e e-mail."); return; }
    if (novaSenha && novaSenha.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    setSalvando(true); setError(""); setSuccess("");
    try {
      let uid = null;
      let aviso = "";
      // Verificar se já existe perfil no Firestore
      const existeSnap = await getDocs(collection(db, "usuarios"));
      const jaExiste = existeSnap.docs.find(d => d.data().email === novoEmail.trim());
      if (jaExiste) {
        setSalvando(false);
        setError("Este e-mail já possui um perfil cadastrado.");
        return;
      }
      if (novaSenha.trim()) {
        try {
          const secAuth = getSecondaryAuth();
          const cred = await createUserWithEmailAndPassword(secAuth, novoEmail.trim(), novaSenha);
          uid = cred.user.uid;
          await signOut(secAuth);
        } catch(authErr) {
          if (authErr.code === "auth/email-already-in-use") {
            // Conta Auth existe mas sem perfil Firestore — recriar apenas o perfil
            aviso = " (conta já existia no sistema de autenticação — perfil recriado)";
          } else {
            const msgs = { "auth/invalid-email":"E-mail inválido.", "auth/weak-password":"Senha muito fraca (mín. 6 caracteres)." };
            setError(msgs[authErr.code] || "Erro de autenticação: " + authErr.message);
            setSalvando(false); return;
          }
        }
      }
      const perfil = { email: novoEmail.trim(), nome: novoNome.trim(), role: novoRole, consultorName: novoRole === "consultor" ? novoConsultor : "", ...(uid ? { uid } : {}) };
      const ref = await addDoc(collection(db, "usuarios"), perfil);
      setUsuarios(prev => [...prev, { id: ref.id, ...perfil }]);
      if (novoRole === "consultor" && novoConsultor && !consultores.includes(novoConsultor)) {
        onAddConsultor && onAddConsultor(novoConsultor);
      }
      setNovoEmail(""); setNovaSenha(""); setNovoNome(""); setNovoConsultor(""); setNovoRole("viewer");
      setSuccess("✅ Usuário criado com sucesso!" + aviso + (novoRole === "consultor" ? " Consultor " + novoConsultor + " vinculado à agenda." : ""));
    } catch(e) {
      setError("Erro ao criar usuário: " + e.message);
    }
    setSalvando(false);
  };

  const handleDelete = async (id, email) => {
    if (!window.confirm("Remover o perfil de " + email + "? (A conta de login precisará ser removida manualmente no Firebase Console se necessário.)")) return;
    await deleteDoc(doc(db, "usuarios", id));
    setUsuarios(prev => prev.filter(u => u.id !== id));
    if (editId === id) setEditId(null);
    setSuccess("🗑 Perfil removido. O usuário não poderá mais acessar o sistema.");
  };

  const handleEditStart = (u) => {
    setEditId(u.id);
    setEditFields({ nome: u.nome || "", role: u.role || "viewer", consultorName: u.consultorName || "" });
  };

  const handleEditSave = async (u) => {
    setEditSaving(true);
    try {
      await setDoc(doc(db, "usuarios", u.id), { ...u, ...editFields }, { merge: true });
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ...editFields } : x));
      if (editFields.role === "consultor" && editFields.consultorName && !consultores.includes(editFields.consultorName)) {
        onAddConsultor && onAddConsultor(editFields.consultorName);
      }
      setEditId(null);
      setSuccess("✅ Usuário atualizado com sucesso!");
    } catch(e) {
      setSuccess(""); setError("Erro ao salvar: " + e.message);
    }
    setEditSaving(false);
  };

  const handleSendReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("📧 E-mail de redefinição de senha enviado para " + email);
    } catch(e) {
      setError("Erro ao enviar reset: " + e.message);
    }
  };

  const inp = { padding:"8px 12px", borderRadius:"8px", border:"1px solid #334155", background:"#0f172a", color:"#e2e8f0", fontSize:"13px", width:"100%", boxSizing:"border-box" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:"#1e293b", borderRadius:"16px", padding:"28px", width:"100%", maxWidth:"660px", border:"1px solid #334155", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
          <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:"18px", fontWeight:700, color:"#f8fafc", margin:0 }}>👥 Gerenciar Usuários</h2>
          <button onClick={onClose} style={{ background:"#334155", border:"none", color:"#94a3b8", borderRadius:"8px", width:"32px", height:"32px", cursor:"pointer", fontSize:"16px" }}>✕</button>
        </div>

        {/* Lista de usuários */}
        <div style={{ marginBottom:"24px" }}>
          <h3 style={{ fontSize:"13px", fontWeight:700, color:"#94a3b8", marginBottom:"10px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Usuários cadastrados</h3>
          {loading ? <p style={{ color:"#475569", fontSize:"13px" }}>Carregando...</p> : (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {usuarios.map(u => {
                const badge = ROLE_BADGES[u.role] || ROLE_BADGES.viewer;
                const isEditing = editId === u.id;
                return (
                  <div key={u.id} style={{ background:"#0f172a", borderRadius:"10px", border:"1px solid " + (isEditing ? "#3b82f6" : "#1e293b"), overflow:"hidden" }}>
                    {/* Linha principal */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px" }}>
                      <div>
                        <div style={{ fontSize:"13px", fontWeight:600, color:"#f1f5f9" }}>{u.nome} <span style={{ fontSize:"11px", color:"#475569" }}>· {u.email}</span></div>
                        <div style={{ display:"flex", gap:"8px", marginTop:"3px" }}>
                          <span style={{ fontSize:"11px", fontWeight:700, color:badge.color, background:badge.bg, padding:"1px 8px", borderRadius:"10px" }}>{badge.label}</span>
                          {u.consultorName && <span style={{ fontSize:"11px", color:"#64748b" }}>{u.consultorName}</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:"6px" }}>
                        <button onClick={()=>isEditing ? setEditId(null) : handleEditStart(u)} style={{ background:isEditing?"#334155":"#3b82f622", border:"1px solid "+(isEditing?"#475569":"#3b82f644"), color:isEditing?"#94a3b8":"#3b82f6", borderRadius:"6px", padding:"4px 10px", cursor:"pointer", fontSize:"12px", fontWeight:600 }}>{isEditing ? "✕" : "✏️ Editar"}</button>
                        <button onClick={()=>handleDelete(u.id, u.email)} style={{ background:"#ef444422", border:"1px solid #ef444444", color:"#ef4444", borderRadius:"6px", padding:"4px 10px", cursor:"pointer", fontSize:"12px", fontWeight:600 }}>🗑</button>
                      </div>
                    </div>
                    {/* Painel de edição inline */}
                    {isEditing && (
                      <div style={{ padding:"14px", borderTop:"1px solid #1e293b", background:"#0a1628" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
                          <div>
                            <label style={{ fontSize:"11px", color:"#64748b", fontWeight:600, display:"block", marginBottom:"4px" }}>Nome</label>
                            <input value={editFields.nome} onChange={e=>setEditFields(f=>({...f,nome:e.target.value}))} style={inp} />
                          </div>
                          <div>
                            <label style={{ fontSize:"11px", color:"#64748b", fontWeight:600, display:"block", marginBottom:"4px" }}>Perfil</label>
                            <select value={editFields.role} onChange={e=>setEditFields(f=>({...f,role:e.target.value}))} style={inp}>
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Visualizador</option>
                              <option value="consultor">Consultor</option>
                            </select>
                          </div>
                          {editFields.role === "consultor" && (
                            <div style={{ gridColumn:"1/-1" }}>
                              <label style={{ fontSize:"11px", color:"#64748b", fontWeight:600, display:"block", marginBottom:"4px" }}>Consultor vinculado</label>
                              <select value={editFields.consultorName} onChange={e=>setEditFields(f=>({...f,consultorName:e.target.value}))} style={inp}>
                                <option value="">Selecione...</option>
                                {consultores.map(c=><option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                          <button onClick={()=>handleEditSave(u)} disabled={editSaving} style={{ padding:"7px 16px", borderRadius:"8px", border:"none", background:"#22c55e", color:"#fff", fontWeight:700, fontSize:"12px", cursor:"pointer" }}>{editSaving ? "Salvando..." : "💾 Salvar"}</button>
                          <button onClick={()=>handleSendReset(u.email)} style={{ padding:"7px 16px", borderRadius:"8px", border:"1px solid #3b82f644", background:"#3b82f622", color:"#3b82f6", fontWeight:600, fontSize:"12px", cursor:"pointer" }}>🔑 Reset de senha</button>
                          <button onClick={()=>setEditId(null)} style={{ padding:"7px 16px", borderRadius:"8px", border:"1px solid #334155", background:"transparent", color:"#64748b", fontWeight:600, fontSize:"12px", cursor:"pointer" }}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Adicionar novo usuário */}
        <div style={{ borderTop:"1px solid #334155", paddingTop:"20px" }}>
          <h3 style={{ fontSize:"13px", fontWeight:700, color:"#94a3b8", marginBottom:"14px", textTransform:"uppercase", letterSpacing:"0.05em" }}>➕ Novo usuário</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
            <div><label style={{ fontSize:"11px", color:"#64748b", fontWeight:600, display:"block", marginBottom:"5px" }}>Nome *</label><input value={novoNome} onChange={e=>setNovoNome(e.target.value)} placeholder="Nome completo" style={inp}/></div>
            <div><label style={{ fontSize:"11px", color:"#64748b", fontWeight:600, display:"block", marginBottom:"5px" }}>E-mail *</label><input type="email" value={novoEmail} onChange={e=>setNovoEmail(e.target.value)} placeholder="email@exemplo.com" style={inp}/></div>
            <div><label style={{ fontSize:"11px", color:"#64748b", fontWeight:600, display:"block", marginBottom:"5px" }}>Senha (mín. 6 caracteres)</label><input type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} placeholder="••••••••" style={inp}/></div>
            <div><label style={{ fontSize:"11px", color:"#64748b", fontWeight:600, display:"block", marginBottom:"5px" }}>Perfil *</label>
              <select value={novoRole} onChange={e=>setNovoRole(e.target.value)} style={inp}>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Visualizador</option>
                <option value="consultor">Consultor</option>
              </select>
            </div>
            {novoRole === "consultor" && (
              <div style={{ gridColumn:"1/-1" }}><label style={{ fontSize:"11px", color:"#64748b", fontWeight:600, display:"block", marginBottom:"5px" }}>Consultor vinculado *</label>
                <select value={novoConsultor} onChange={e=>setNovoConsultor(e.target.value)} style={inp}>
                  <option value="">Selecione o consultor...</option>
                  {consultores.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
          {error && <div style={{ padding:"8px 12px", borderRadius:"8px", background:"#ef444422", border:"1px solid #ef444444", color:"#ef4444", fontSize:"12px", marginBottom:"10px" }}>⚠️ {error}</div>}
          {success && <div style={{ padding:"8px 12px", borderRadius:"8px", background:"#22c55e22", border:"1px solid #22c55e44", color:"#22c55e", fontSize:"12px", marginBottom:"10px" }}>{success}</div>}
          <button onClick={handleAdd} disabled={salvando} style={{ width:"100%", padding:"11px", borderRadius:"8px", border:"none", background:salvando?"#334155":"#22c55e", color:salvando?"#64748b":"#fff", fontWeight:700, fontSize:"14px", cursor:salvando?"not-allowed":"pointer" }}>
            {salvando ? "Criando usuário..." : "✅ Criar usuário"}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function ConsultorDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Verificar sessão salva ao carregar (opção 5 — lembrar login)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.email);
        if (profile) setCurrentUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...profile });
      }
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  if (!authChecked) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#0f172a", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet"/>
      <div style={{ fontSize:"48px" }}>📅</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:"20px", fontWeight:700, color:"#f8fafc" }}>Agenda de Consultores</div>
      <div style={{ display:"flex", alignItems:"center", gap:"12px", color:"#64748b", fontSize:"14px" }}>
        <div style={{ width:"20px", height:"20px", border:"3px solid #334155", borderTop:"3px solid #3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
        Verificando sessão...
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;
  return <Dashboard currentUser={currentUser} onLogout={async ()=>{ await signOut(auth); setCurrentUser(null); }} />;
}


// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD (wrapped — receives auth user)
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({ currentUser, onLogout }) {
  const isAdmin    = currentUser.role === "admin";
  const isEditor   = currentUser.role === "editor";
  const isViewer   = currentUser.role === "viewer";
  const isConsultor= currentUser.role === "consultor";
  const canEdit    = isAdmin || isEditor;   // can add/edit/delete entries
  const canManage  = isAdmin;               // can access Cadastros tab
  const [scheduleData, setScheduleData] = useState(SCHEDULE_DATA);
  const [clientList, setClientList] = useState(INITIAL_CLIENTS.map(n=>({ name:n, color:CLIENT_COLORS[n]||CLIENT_COLORS.default })));
  const [projects, setProjects] = useState([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [selectedConsultor, setSelectedConsultor] = useState(isConsultor ? currentUser.consultorName : null);
  const [selectedMonth, setSelectedMonth] = useState("Todos");
  const [searchClient, setSearchClient] = useState("");
  const [view, setView] = useState("calendario");
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [toast, setToast] = useState(null);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [consultorViewMode, setConsultorViewMode] = useState("mensal"); // "semanal" | "mensal"

  const isDark = theme === "dark";
  const T = {
    bg: isDark ? "#0f172a" : "#f1f5f9",
    surface: isDark ? "#1e293b" : "#ffffff",
    surface2: isDark ? "#0f172a" : "#f8fafc",
    border: isDark ? "#1e293b" : "#e2e8f0",
    border2: isDark ? "#334155" : "#cbd5e1",
    text: isDark ? "#e2e8f0" : "#1e293b",
    text2: isDark ? "#94a3b8" : "#64748b",
    text3: isDark ? "#64748b" : "#94a3b8",
    heading: isDark ? "#f8fafc" : "#0f172a",
    headerBg: isDark ? "linear-gradient(135deg,#1e293b 0%,#0f172a 100%)" : "linear-gradient(135deg,#ffffff 0%,#f1f5f9 100%)",
    headerBorder: isDark ? "#1e293b" : "#e2e8f0",
    btnInactive: isDark ? "#1e293b" : "#e2e8f0",
    btnInactiveText: isDark ? "#94a3b8" : "#475569",
    filterBg: isDark ? "#1e293b" : "#ffffff",
    inputBg: isDark ? "#0f172a" : "#f8fafc",
    inputColor: isDark ? "#e2e8f0" : "#1e293b",
    cardBg: isDark ? "#1e293b" : "#ffffff",
  };

  // ── Carregar dados do Firestore na inicialização ──
  useEffect(() => {
    async function loadData() {
      const [sd, cl, pj] = await Promise.all([
        loadFromFirestore("scheduleData", SCHEDULE_DATA),
        loadFromFirestore("clientList", INITIAL_CLIENTS.map(n=>({ name:n, color:CLIENT_COLORS[n]||CLIENT_COLORS.default }))),
        loadFromFirestore("projects", []),
      ]);
      setScheduleData(ensureIds(sd));
      setClientList(cl);
      setProjects(pj);
      setDbLoaded(true);
    }
    loadData();
  }, []);

  // ── Salvar scheduleData no Firestore quando mudar ──
  useEffect(() => {
    if (!dbLoaded) return;
    saveToFirestore("scheduleData", scheduleData);
  }, [scheduleData, dbLoaded]);

  // ── Salvar clientList no Firestore quando mudar ──
  useEffect(() => {
    if (!dbLoaded) return;
    saveToFirestore("clientList", clientList);
  }, [clientList, dbLoaded]);

  // ── Salvar projects no Firestore quando mudar ──
  useEffect(() => {
    if (!dbLoaded) return;
    saveToFirestore("projects", projects);
  }, [projects, dbLoaded]);


  const consultores = Object.keys(scheduleData);
  const clientColorMap = useMemo(()=>{ const m={}; clientList.forEach(c=>{ m[c.name]=c.color; }); return m; },[clientList]);

  const showToast = (msg,color) => { setToast({msg,color:color||"#22c55e"}); setTimeout(()=>setToast(null),3000); };

  const handleSaveEntry = (entry) => {
    const {id, consultor, month, year, days, client, type, horaInicio, horaFim, intervalo, atividades} = entry;
    const agora = new Date().toISOString();
    const nomeUsuario = currentUser.nome || currentUser.email;
    setScheduleData(prev=>{
      const updated={...prev};
      let list=[...(updated[consultor]||[])];
      days.forEach(day=>{
        if (id) {
          // Editar entrada existente pelo id
          const idx = list.findIndex(e=>e.id===id);
          if (idx>=0) {
            const old = list[idx];
            const alteracoes = [];
            if (old.client !== client) alteracoes.push({campo:"cliente", de:old.client||"-", para:client});
            if (old.type !== type) alteracoes.push({campo:"tipo", de:old.type||"-", para:type});
            if (old.horaInicio !== horaInicio) alteracoes.push({campo:"início", de:old.horaInicio||"-", para:horaInicio});
            if (old.horaFim !== horaFim) alteracoes.push({campo:"fim", de:old.horaFim||"-", para:horaFim});
            if ((old.intervalo||"") !== (intervalo||"")) alteracoes.push({campo:"intervalo", de:old.intervalo||"-", para:intervalo||"-"});
            const hist = [...(old.historico||[{acao:"criado",por:old.criadoPor||"?",em:old.criadoEm||agora}]), {acao:"alterado",por:nomeUsuario,em:agora,alteracoes}];
            if ((old.atividades||'') !== (atividades||'')) alteracoes.push({campo:'atividades', de:old.atividades||'-', para:atividades||'-'});
            list[idx]={...old,client,type,horaInicio,horaFim,intervalo,atividades,alteradoPor:nomeUsuario,alteradoEm:agora,historico:hist};
          }
        } else {
          // Nova entrada
          const newId = genId();
          list.push({id:newId,month,year,day,weekday:"-",client,type,horaInicio,horaFim,intervalo,atividades,criadoPor:nomeUsuario,criadoEm:agora,historico:[{acao:"criado",por:nomeUsuario,em:agora}]});
        }
      });
      list.sort((a,b)=>{
        const mi=MONTHS_ORDER.findIndex(m=>m.toUpperCase()===a.month.toUpperCase());
        const mj=MONTHS_ORDER.findIndex(m=>m.toUpperCase()===b.month.toUpperCase());
        if (mi!==mj) return mi-mj;
        if (a.day!==b.day) return a.day-b.day;
        return (a.horaInicio||"00:00").localeCompare(b.horaInicio||"00:00");
      });
      updated[consultor]=list;
      return updated;
    });
    showToast("✅ "+(id?"Entrada atualizada":""+days.length+" dia(s) salvo(s)")+" para "+consultor.split(" ")[0]);
    setShowModal(false); setEditEntry(null);
  };

  const handleDeleteEntry = (consultor, entryId) => {
    setScheduleData(prev=>{ const u={...prev}; u[consultor]=(u[consultor]||[]).filter(e=>e.id!==entryId); return u; });
    showToast("🗑 Entrada removida","#ef4444");
  };

  // Cadastros handlers
  const handleAddConsultor = (name) => {
    if (scheduleData[name]) { showToast("Consultor já existe","#ef4444"); return; }
    setScheduleData(prev=>({...prev,[name]:[]}));
    showToast("👤 Consultor "+name+" cadastrado!");
  };
  const handleRemoveConsultor = (name) => {
    setScheduleData(prev=>{ const u={...prev}; delete u[name]; return u; });
    showToast("🗑 Consultor removido","#ef4444");
  };
  const handleAddClient = (name,color) => {
    if (clientList.find(c=>c.name===name)) { showToast("Cliente já existe","#ef4444"); return; }
    setClientList(prev=>[...prev,{name,color}]);
    showToast("🏢 Cliente "+name+" cadastrado!");
  };
  const handleRemoveClient = (name) => { setClientList(prev=>prev.filter(c=>c.name!==name)); showToast("🗑 Cliente removido","#ef4444"); };
  const handleAddProject = (project) => { setProjects(prev=>[...prev,project]); showToast("📋 Projeto "+project.name+" cadastrado!"); };
  const handleRemoveProject = (idx) => { setProjects(prev=>prev.filter((_,i)=>i!==idx)); showToast("🗑 Projeto removido","#ef4444"); };

  const allMonths = useMemo(()=>["Todos",...MONTHS_ORDER],[]);

  const filteredData = useMemo(()=>{
    const src=selectedConsultor?{[selectedConsultor]:scheduleData[selectedConsultor]}:scheduleData;
    const result={};
    for (const [name,entries] of Object.entries(src)) {
      result[name]=(entries||[]).filter(e=>{
        const mo=selectedMonth==="Todos"||e.month.toUpperCase()===selectedMonth.toUpperCase();
        const co=!searchClient||e.client.toUpperCase().includes(searchClient.toUpperCase());
        return mo&&co;
      });
    }
    return result;
  },[selectedConsultor,selectedMonth,searchClient,scheduleData]);

  const stats = useMemo(()=>{
    const allEntries=Object.values(filteredData).flat();
    const clientDays={};
    allEntries.forEach(e=>{ if(e.type==="client"){ const n=normalizeClient(e.client); clientDays[n]=(clientDays[n]||0)+1; }});
    const topClients=Object.entries(clientDays).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const consultorStats=Object.entries(filteredData).map(([name,entries])=>({ name, working:entries.filter(e=>e.type==="client").length, vacation:entries.filter(e=>e.type==="vacation").length, reserved:entries.filter(e=>e.type==="reserved").length })).sort((a,b)=>b.working-a.working);
    return {topClients,consultorStats};
  },[filteredData]);

  const calendarData = useMemo(()=>{
    if (!selectedConsultor||selectedMonth==="Todos") return null;
    const entries=filteredData[selectedConsultor]||[];
    const byDay={};
    entries.forEach(e=>{byDay[e.day]=e;});
    return byDay;
  },[selectedConsultor,selectedMonth,filteredData]);

  const VIEWS = canManage
    ? ["grid","calendario","timeline","stats","cadastros"]
    : ["grid","calendario","timeline","stats"];
  const VIEW_LABELS = { grid:"🗓 Grade", calendario:"📆 Calendário", timeline:"📊 Timeline", stats:"📈 Stats", cadastros:"🗂 Cadastros" };

  const badge = ROLE_BADGES[currentUser.role];

  // Tela de carregamento enquanto busca dados do Firestore
  if (!dbLoaded) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#0f172a", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet"/>
      <div style={{ fontSize:"48px" }}>📅</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:"20px", fontWeight:700, color:"#f8fafc" }}>Agenda de Consultores</div>
      <div style={{ display:"flex", alignItems:"center", gap:"12px", color:"#64748b", fontSize:"14px" }}>
        <div style={{ width:"20px", height:"20px", border:"3px solid #334155", borderTop:"3px solid #3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
        Carregando dados...
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:"100vh",color:T.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{ background:T.headerBg,borderBottom:"1px solid "+T.headerBorder,padding:"16px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:"20px",fontWeight:700,color:T.heading,margin:0 }}>📅 Agenda de Consultores</h1>
          <p style={{ margin:"3px 0 0",fontSize:"12px",color:T.text2 }}>
            {consultores.length} consultores · {Object.values(scheduleData).flat().filter(e=>e.type==="client").length} dias agendados
            {canManage && ` · ${clientList.length} clientes · ${projects.length} projetos`}
          </p>
          <p style={{ margin:"4px 0 0",fontSize:"10px",color:T.text3,fontStyle:"italic" }}>Desenvolvido por Marcelo Alexandre · Todos os direitos reservados</p>
        </div>
        <div style={{ display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center" }}>
          {/* New agenda button — only for editors/admins */}
          {canEdit && (
            <button onClick={()=>{setEditEntry(null);setShowModal(true);}} style={{ padding:"8px 16px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:700,fontSize:"13px",background:"#22c55e",color:"#fff" }}>➕ Nova Agenda</button>
          )}
          {canManage && (
            <button onClick={()=>setShowUserMgmt(true)} style={{ padding:"8px 16px",borderRadius:"8px",border:"1px solid "+T.border2,cursor:"pointer",fontWeight:600,fontSize:"13px",background:T.btnInactive,color:T.btnInactiveText }}>👥 Usuários</button>
          )}
          {VIEWS.map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:"8px 16px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"13px",background:view===v?"#3b82f6":T.btnInactive,color:view===v?"#fff":T.btnInactiveText }}>{VIEW_LABELS[v]}</button>
          ))}
          {/* Theme toggle */}
          <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} title={isDark?"Tema claro":"Tema escuro"} style={{ padding:"8px 12px",borderRadius:"8px",border:"1px solid "+T.border2,cursor:"pointer",fontWeight:600,fontSize:"16px",background:T.btnInactive,color:T.btnInactiveText,lineHeight:1 }}>{isDark?"☀️":"🌙"}</button>
          {/* User badge + logout */}
          <div style={{ display:"flex",alignItems:"center",gap:"8px",padding:"6px 12px",borderRadius:"8px",background:T.surface2,border:"1px solid "+T.border,marginLeft:"4px" }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"13px",fontWeight:700,color:T.heading }}>{currentUser.consultorName || currentUser.username}</div>
              <div style={{ display:"inline-block",fontSize:"10px",fontWeight:700,color:badge.color,background:badge.bg,padding:"1px 8px",borderRadius:"10px",marginTop:"2px" }}>{badge.label}</div>
            </div>
            <button onClick={onLogout} title="Sair" style={{ background:T.btnInactive,border:"1px solid "+T.border2,color:T.text2,borderRadius:"8px",width:"32px",height:"32px",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center" }}>⎋</button>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && <div style={{ position:"fixed",top:"20px",right:"20px",background:toast.color,color:"#fff",padding:"12px 20px",borderRadius:"10px",fontWeight:600,fontSize:"14px",zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.3)" }}>{toast.msg}</div>}

      {/* MODAL — only for editors/admins */}
      {showModal && canEdit && (
        <AgendaModal
          consultores={consultores}
          clients={clientList.map(c=>c.name)}
          months={MONTHS_ORDER}
          editEntry={editEntry}
          onSave={handleSaveEntry}
          onClose={()=>{setShowModal(false);setEditEntry(null);}}
        />
      )}

      {/* READONLY BANNER for viewer/consultor */}
      {(isViewer || isConsultor) && (
        <div style={{ background:isDark?"#1f1a0e":"#fffbeb",borderBottom:"1px solid "+isDark?"#f59e0b33":"#fcd34d",padding:"8px 32px",display:"flex",alignItems:"center",gap:"10px" }}>
          <span style={{ fontSize:"14px" }}>🔒</span>
          <span style={{ fontSize:"13px",color:"#f59e0b",fontWeight:500 }}>
            {isConsultor
              ? `Acesso restrito — você está visualizando apenas a agenda de ${currentUser.consultorName}.`
              : "Modo visualização — você não tem permissão para editar agendas."}
          </span>
        </div>
      )}

      {/* FILTERS — consultor sees only their own, no toggle */}
      {view !== "cadastros" && (
        <div style={{ background:T.filterBg,padding:"12px 32px",display:"flex",gap:"16px",flexWrap:"wrap",alignItems:"center",borderBottom:"1px solid "+T.border2 }}>
          {!isConsultor && (
            <select
              value={selectedConsultor || ""}
              onChange={e => setSelectedConsultor(e.target.value || null)}
              style={{ padding:"8px 14px",borderRadius:"8px",border:"1px solid "+T.border2,background:T.inputBg,color:T.inputColor,fontSize:"13px",cursor:"pointer",minWidth:"180px" }}
            >
              <option value="">Todos os consultores</option>
              {consultores.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          {isConsultor && (
            <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
              <div style={{ width:"32px",height:"32px",borderRadius:"50%",background:"hsl("+(consultores.indexOf(currentUser.consultorName)*29%360)+",65%,55%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,color:"#fff" }}>{getInitials(currentUser.consultorName||"")}</div>
              <span style={{ fontSize:"14px",fontWeight:600,color:T.heading }}>{currentUser.consultorName}</span>
            </div>
          )}
          <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={{ padding:"8px 14px",borderRadius:"8px",border:"1px solid "+T.border2,background:T.inputBg,color:T.inputColor,fontSize:"13px",cursor:"pointer" }}>
            {allMonths.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <input placeholder="🔍 Buscar cliente..." value={searchClient} onChange={e=>setSearchClient(e.target.value)} style={{ padding:"8px 14px",borderRadius:"8px",border:"1px solid "+T.border2,background:T.inputBg,color:T.inputColor,fontSize:"13px",minWidth:"180px" }}/>
          {/* Semanal / Mensal toggle — shown when a consultant is selected */}
          {selectedConsultor && (
            <div style={{ display:"flex",gap:"4px",marginLeft:"auto",background:T.surface2,borderRadius:"10px",padding:"3px",border:"1px solid "+T.border2 }}>
              <button onClick={()=>setConsultorViewMode("semanal")} style={{ padding:"6px 14px",borderRadius:"7px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"12px",background:consultorViewMode==="semanal"?"#3b82f6":"transparent",color:consultorViewMode==="semanal"?"#fff":T.btnInactiveText,transition:"all .15s" }}>📅 Semanal</button>
              <button onClick={()=>setConsultorViewMode("mensal")} style={{ padding:"6px 14px",borderRadius:"7px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"12px",background:consultorViewMode==="mensal"?"#3b82f6":"transparent",color:consultorViewMode==="mensal"?"#fff":T.btnInactiveText,transition:"all .15s" }}>🗓 Mensal</button>
            </div>
          )}
        </div>
      )}

      {/* CONTENT */}
      <div style={{ padding:"24px 32px" }}>
        {view==="grid" && (
          selectedConsultor
            ? consultorViewMode==="semanal"
              ? selectedMonth!=="Todos"&&calendarData
                ? <CalendarView consultant={selectedConsultor} month={selectedMonth} byDay={calendarData}/>
                : <div style={{ textAlign:"center",padding:"60px 20px",color:T.text2,fontSize:"14px" }}>
                    <div style={{ fontSize:"36px",marginBottom:"12px" }}>📅</div>
                    Selecione um mês específico para ver a visualização semanal
                  </div>
              : <CalendarioMensal
                  data={{[selectedConsultor]: scheduleData[selectedConsultor]||[]}}
                  selectedMonth={selectedMonth}
                  allMonths={allMonths}
                  consultores={[selectedConsultor]}
                  clientColors={clientColorMap}
                  readonly={!canEdit}
                  onEdit={canEdit ? (entry)=>{setEditEntry(entry);setShowModal(true);} : null}
                  onDelete={canEdit ? handleDeleteEntry : null}
                  onNewEntry={canEdit ? ({consultor,month,day})=>{ setEditEntry({consultor,month,day,prefill:true}); setShowModal(true); } : null}
                />
            : <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"16px" }}>
                {Object.entries(filteredData).filter(([,e])=>e.length>0).map(([name,entries])=>(
                  <ConsultorCard key={name} name={name} entries={entries} idx={consultores.indexOf(name)} onClick={()=>!isConsultor&&setSelectedConsultor(selectedConsultor===name?null:name)} selected={selectedConsultor===name}/>
                ))}
              </div>
        )}
        {view==="calendario" && (
          selectedConsultor && consultorViewMode==="semanal"
            ? selectedMonth!=="Todos"&&calendarData
              ? <CalendarView consultant={selectedConsultor} month={selectedMonth} byDay={calendarData}/>
              : <div style={{ textAlign:"center",padding:"60px 20px",color:T.text2,fontSize:"14px" }}>
                  <div style={{ fontSize:"36px",marginBottom:"12px" }}>📅</div>
                  Selecione um mês específico para ver a visualização semanal
                </div>
            : <CalendarioMensal
                data={filteredData} selectedMonth={selectedMonth} allMonths={allMonths}
                consultores={isConsultor ? [currentUser.consultorName] : consultores}
                clientColors={clientColorMap}
                readonly={!canEdit}
                onEdit={canEdit ? (entry)=>{setEditEntry(entry);setShowModal(true);} : null}
                onDelete={canEdit ? handleDeleteEntry : null}
                onNewEntry={canEdit ? ({consultor,month,day})=>{ setEditEntry({consultor,month,day,prefill:true}); setShowModal(true); } : null}
              />
        )}
        {view==="timeline" && <TimelineView data={filteredData} months={allMonths.filter(m=>m!=="Todos")}/>}
        {view==="stats" && <StatsView stats={stats}/>}

        {view==="cadastros" && canManage && (
          <CadastrosView
            consultores={consultores} clients={clientList} projects={projects}
            onAddConsultor={handleAddConsultor} onRemoveConsultor={handleRemoveConsultor}
            onAddClient={handleAddClient} onRemoveClient={handleRemoveClient}
            onAddProject={handleAddProject} onRemoveProject={handleRemoveProject}
          />
        )}
      </div>
      {showUserMgmt && (
        <GerenciarUsuarios
          consultores={consultores}
          onAddConsultor={handleAddConsultor}
          onClose={() => setShowUserMgmt(false)}
        />
      )}
    </div>
  );
}
