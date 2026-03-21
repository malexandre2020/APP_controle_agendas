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

// ─── EMAIL CONFIG DEFAULT (substituído pelas configurações salvas no Firestore) ──
const EMAIL_CONFIG_DEFAULT = {
  enabled:    false,
  publicKey:  "",
  serviceId:  "",
  templateId: "",
};

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
const CLIENT_COLORS = { VEDACIT:"#3b82f6",TIROLEZ:"#f59e0b",MAZZAFERRO:"#8b5cf6",TSJC:"#10b981",TSUL:"#06b6d4",GHT4:"#f97316",UNIMOL:"#ec4899",TEJOFRAN:"#6366f1",TSM:"#84cc16",TOYOBO:"#a855f7",PARTICULAR:"#6e6e88",CABOVEL:"#14b8a6",GOBEAUTE:"#f43f5e",RESERVADO:"#6e6e88",default:"#6b7280" };

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
  const currentMonth = new Date().getMonth(); // 0-11
  const result = {};
  for (const [c, entries] of Object.entries(scheduleData||{})) {
    result[c] = (entries||[]).map(e => {
      let upd = e.id ? e : {...e, id: genId()};
      if (!upd.year) {
        let inferredYear = currentYear;
        if (upd.criadoEm) {
          try { inferredYear = new Date(upd.criadoEm).getFullYear(); } catch(_) {}
        } else {
          // Inferir pelo mês: Set-Dez sem criadoEm → provavelmente ano anterior
          const mIdx = MONTHS_ORDER.findIndex(m => m.toUpperCase() === (upd.month||"").toUpperCase());
          if (mIdx >= 0) {
            // Se o mês da entrada é posterior ao mês atual, é do ano anterior
            if (mIdx > currentMonth) {
              inferredYear = currentYear - 1;
            }
          }
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
  const [modalidade, setModalidade] = useState(editEntry?.modalidade || "presencial");
  const [horaInicio, setHoraInicio] = useState(editEntry?.horaInicio || "08:00");
  const [horaFim, setHoraFim] = useState(editEntry?.horaFim || "17:00");
  const [intervalo, setIntervalo] = useState(editEntry?.intervalo || "");
  const [atividades, setAtividades] = useState(editEntry?.atividades || "");
  const [dayMode, setDayMode] = useState("range");
  const [dayFrom, setDayFrom] = useState(editEntry?.day || 1);
  const [dayTo, setDayTo] = useState(editEntry?.day || 1);
  const [selectedDays, setSelectedDays] = useState(editEntry?.day ? [editEntry.day] : []);
  const [error, setError] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);

  const toggleDay = (d) => setSelectedDays(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev,d].sort((a,b)=>a-b));

  const handleSave = () => {
    if (!consultor) { setError("Selecione um consultor."); return; }
    if (!client.trim() && type === "client") { setError("Informe o cliente."); return; }
    let days = [];
    if (isEdit) { days = [editEntry.day]; }
    else if (dayMode === "range") { for (let d=Number(dayFrom);d<=Number(dayTo);d++) days.push(d); }
    else { days = selectedDays; }
    if (days.length === 0) { setError("Selecione ao menos um dia."); return; }
    onSave({ id: editEntry?.id, consultor, month, year: Number(year), days, client: client.trim(), type, modalidade, horaInicio, horaFim, intervalo, atividades: atividades.trim(), notifyEmail });
  };

  const inp = { padding:"9px 13px", borderRadius:"10px", border:"1px solid #2a2a3a", background:"#0d0d14", color:"#c8c8d8", fontSize:"13px", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
  const lbl = { fontSize:"11px", color:"#3e3e55", fontWeight:700, marginBottom:"7px", display:"block", letterSpacing:"0.5px", textTransform:"uppercase" };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
      <div style={{ background:"#111118",borderRadius:"20px",padding:"30px",width:"100%",maxWidth:"520px",border:"1px solid #1f1f2e",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,0.8)",animation:"fadeUp .25s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px" }}>
          <div>
            <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"18px",fontWeight:900,color:"#f0f0fa",margin:0,letterSpacing:"-0.3px" }}>{isEdit?"Editar Agenda":"Nova Agenda"}</h2>
            {isPrefill && <p style={{ margin:"4px 0 0",fontSize:"12px",color:"#3e3e55" }}>📅 {editEntry.consultor.split(" ")[0]} · {editEntry.month} · Dia {editEntry.day}</p>}
          </div>
          <button onClick={onClose} style={{ background:"#1f1f2e",border:"1px solid #2a2a3a",color:"#6e6e88",borderRadius:"10px",width:"32px",height:"32px",cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✕</button>
        </div>
        {error && <div style={{ background:"#f04f5e15",border:"1px solid #f04f5e40",borderRadius:"10px",padding:"10px 14px",color:"#f87171",fontSize:"13px",marginBottom:"16px" }}>⚠️ {error}</div>}
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
          <div style={{ display:"flex",gap:"5px",flexWrap:"wrap" }}>
            {[["client","👤 Cliente"],["vacation","🏖 Férias"],["holiday","🎉 Feriado"],["reserved","🔒 Reservado"],["blocked","⛔ Bloqueado"]].map(([val,lab])=>(
              <button key={val} onClick={()=>setType(val)} style={{ padding:"6px 13px",borderRadius:"99px",border:"1px solid",cursor:"pointer",fontSize:"12px",fontWeight:600,transition:"all .15s",borderColor:type===val?"#6c63ff":"#2a2a3a",background:type===val?"#6c63ff22":"transparent",color:type===val?"#a78bfa":"#3e3e55" }}>{lab}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:"16px" }}>
          <label style={lbl}>Modalidade</label>
          <div style={{ display:"flex", gap:"8px" }}>
            {[["presencial","🏢 Presencial"],["remoto","💻 Remoto"]].map(([val,lab])=>(
              <button key={val} onClick={()=>setModalidade(val)} style={{ flex:1, padding:"10px 16px", borderRadius:"12px", border:"1px solid", cursor:"pointer", fontSize:"13px", fontWeight:600, transition:"all .15s",
                borderColor: modalidade===val ? (val==="presencial"?"#22d3a0":"#6c63ff") : "#2a2a3a",
                background: modalidade===val ? (val==="presencial"?"#22d3a015":"#6c63ff15") : "transparent",
                color: modalidade===val ? (val==="presencial"?"#22d3a0":"#a78bfa") : "#3e3e55"
              }}>{lab}</button>
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
            <div style={{ fontSize:"11px", color:"#6e6e88", marginTop:"6px" }}>
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
              <button onClick={()=>setDayMode("range")} style={{ padding:"6px 14px",borderRadius:"20px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,background:dayMode==="range"?"#6366f1":"#2a2a3a",color:dayMode==="range"?"#fff":"#6e6e88" }}>📅 Período</button>
              <button onClick={()=>setDayMode("individual")} style={{ padding:"6px 14px",borderRadius:"20px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,background:dayMode==="individual"?"#6366f1":"#2a2a3a",color:dayMode==="individual"?"#fff":"#6e6e88" }}>🔢 Individuais</button>
            </div>
            {dayMode==="range" ? (
              <div style={{ display:"flex",gap:"12px",alignItems:"flex-end" }}>
                <div style={{ flex:1 }}><label style={{...lbl,fontSize:"11px"}}>Dia inicial</label><input type="number" min="1" max="31" value={dayFrom} onChange={e=>setDayFrom(e.target.value)} style={inp}/></div>
                <div style={{ color:"#6e6e88",paddingBottom:"10px",fontSize:"18px" }}>→</div>
                <div style={{ flex:1 }}><label style={{...lbl,fontSize:"11px"}}>Dia final</label><input type="number" min="1" max="31" value={dayTo} onChange={e=>setDayTo(e.target.value)} style={inp}/></div>
                {dayFrom && dayTo && Number(dayFrom)<=Number(dayTo) && <div style={{ paddingBottom:"10px",color:"#22d3a0",fontWeight:700,fontSize:"13px" }}>{Number(dayTo)-Number(dayFrom)+1}d</div>}
              </div>
            ) : (
              <div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px" }}>
                  {Array.from({length:31},(_,i)=>i+1).map(d=>(
                    <button key={d} onClick={()=>toggleDay(d)} style={{ padding:"6px 2px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:700,background:selectedDays.includes(d)?"#3b82f6":"#2a2a3a",color:selectedDays.includes(d)?"#fff":"#6e6e88" }}>{d}</button>
                  ))}
                </div>
                <p style={{ fontSize:"11px",color:"#6e6e88",margin:"8px 0 0" }}>{selectedDays.length} dia(s) selecionado(s)</p>
              </div>
            )}
          </div>
        )}
        {/* Show locked day info when editing or prefilling */}
        {(isEdit || isPrefill) && (
          <div style={{ marginBottom:"20px" }}>
            <label style={lbl}>Dia</label>
            <div style={{ display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #2a2a3a" }}>
              <span style={{ fontSize:"20px" }}>📅</span>
              <div>
                <div style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa" }}>Dia {editEntry.day} de {editEntry.month}{editEntry.year ? " " + editEntry.year : ""}</div>
                <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"1px" }}>{editEntry.consultor}</div>
              </div>
            </div>
          </div>
        )}
        {/* Notificação por e-mail */}
        <div style={{ display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #2a2a3a",marginBottom:"16px" }}>
          <input
            type="checkbox"
            id="notifyEmailChk"
            checked={notifyEmail}
            onChange={e=>setNotifyEmail(e.target.checked)}
            style={{ width:"16px",height:"16px",cursor:"pointer",accentColor:"#3b82f6" }}
          />
          <label htmlFor="notifyEmailChk" style={{ fontSize:"13px",color:"#6e6e88",cursor:"pointer",userSelect:"none" }}>
            📧 Notificar por e-mail
            {isEdit
              ? <span style={{ fontSize:"11px",color:"#6e6e88",marginLeft:"6px" }}>(consultor + quem incluiu, se diferente)</span>
              : <span style={{ fontSize:"11px",color:"#6e6e88",marginLeft:"6px" }}>(consultor + você)</span>
            }
          </label>
        </div>
        <div style={{ display:"flex",gap:"10px",justifyContent:"flex-end",paddingTop:"4px" }}>
          <button onClick={onClose} style={{ padding:"10px 20px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontWeight:600,fontSize:"13px",fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding:"10px 24px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>{isEdit?"Salvar alterações":"Adicionar agenda"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DE E-MAIL (tab dentro de Cadastros)
// ─────────────────────────────────────────────────────────────────────────────
function EmailConfigTab({ emailConfig, onSave }) {
  const [publicKey,  setPublicKey]  = useState(emailConfig.publicKey  || "");
  const [serviceId,  setServiceId]  = useState(emailConfig.serviceId  || "");
  const [templateId, setTemplateId] = useState(emailConfig.templateId || "");
  const [enabled,    setEnabled]    = useState(emailConfig.enabled    || false);
  const [testStatus, setTestStatus] = useState(null); // null | "sending" | "ok" | "err"

  const inp = { padding:"8px 12px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",width:"100%",boxSizing:"border-box",fontFamily:"monospace" };
  const lbl = { fontSize:"12px",color:"#6e6e88",fontWeight:600,display:"block",marginBottom:"6px" };
  const card = { background:"#18181f",borderRadius:"12px",padding:"20px",border:"1px solid #2a2a3a" };

  const isConfigured = publicKey.trim() && serviceId.trim() && templateId.trim();

  const handleTestSend = async () => {
    if (!isConfigured) return;
    setTestStatus("sending");
    try {
      const loadEJ = () => new Promise((resolve, reject) => {
        if (window.emailjs) { resolve(window.emailjs); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        s.onload = () => { window.emailjs.init({ publicKey: publicKey.trim() }); resolve(window.emailjs); };
        s.onerror = reject;
        document.head.appendChild(s);
      });
      const ej = await loadEJ();
      // re-init with current key
      ej.init({ publicKey: publicKey.trim() });
      // dummy test
      await ej.send(serviceId.trim(), templateId.trim(), {
        to_name: "Administrador", to_email: emailConfig._testEmail || "teste@email.com",
        assunto: "✅ Teste de configuração — Agenda de Consultores",
        corpo: "<p>Este é um e-mail de teste enviado pelo sistema Agenda de Consultores.</p><p>Se você recebeu esta mensagem, a configuração está correta!</p>",
        acao:"teste", consultor:"—", cliente:"—", mes_ano:"—", dias:"—", horario:"—", atividades:"—", realizado_por:"Admin",
      });
      setTestStatus("ok");
      setTimeout(() => setTestStatus(null), 4000);
    } catch(e) {
      setTestStatus("err");
      console.error(e);
      setTimeout(() => setTestStatus(null), 5000);
    }
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"24px" }}>
      {/* LEFT – form */}
      <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
        <div style={card}>
          <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>⚙️ Credenciais EmailJS</h3>
          <p style={{ fontSize:"12px",color:"#6e6e88",marginTop:0,marginBottom:"16px",lineHeight:"1.6" }}>
            Configure sua conta em{" "}
            <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" style={{ color:"#6c63ff" }}>emailjs.com</a>{" "}
            (plano gratuito inclui 200 e-mails/mês).
          </p>

          {/* Enable toggle */}
          <div style={{ display:"flex",alignItems:"center",gap:"12px",padding:"10px 14px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #2a2a3a",marginBottom:"16px",cursor:"pointer" }} onClick={()=>setEnabled(e=>!e)}>
            <div style={{ width:"40px",height:"22px",borderRadius:"11px",background:enabled?"#22c55e":"#2a2a3a",position:"relative",transition:"background .2s",flexShrink:0 }}>
              <div style={{ position:"absolute",top:"3px",left:enabled?"21px":"3px",width:"16px",height:"16px",borderRadius:"50%",background:"#fff",transition:"left .2s" }}/>
            </div>
            <span style={{ fontSize:"13px",fontWeight:600,color:enabled?"#22c55e":"#6e6e88" }}>
              {enabled ? "✅ Envio de e-mails ativado" : "⭕ Envio de e-mails desativado"}
            </span>
          </div>

          <div style={{ display:"flex",flexDirection:"column",gap:"14px" }}>
            <div>
              <label style={lbl}>🔑 Public Key <span style={{ color:"#6e6e88",fontWeight:400 }}>(Account → API Keys)</span></label>
              <input value={publicKey} onChange={e=>setPublicKey(e.target.value)} placeholder="ex: aBcDeFgHiJkLmNoP" style={inp}/>
            </div>
            <div>
              <label style={lbl}>📡 Service ID <span style={{ color:"#6e6e88",fontWeight:400 }}>(Email Services)</span></label>
              <input value={serviceId} onChange={e=>setServiceId(e.target.value)} placeholder="ex: service_xxxxxxx" style={inp}/>
            </div>
            <div>
              <label style={lbl}>📄 Template ID <span style={{ color:"#6e6e88",fontWeight:400 }}>(Email Templates)</span></label>
              <input value={templateId} onChange={e=>setTemplateId(e.target.value)} placeholder="ex: template_xxxxxxx" style={inp}/>
            </div>
          </div>

          <div style={{ display:"flex",gap:"10px",marginTop:"20px",alignItems:"center",flexWrap:"wrap" }}>
            <button
              onClick={()=>onSave({ enabled, publicKey:publicKey.trim(), serviceId:serviceId.trim(), templateId:templateId.trim() })}
              style={{ padding:"10px 24px",borderRadius:"8px",border:"none",background:"#6c63ff",color:"#fff",fontWeight:700,fontSize:"13px",cursor:"pointer" }}>
              💾 Salvar configuração
            </button>
            <button
              onClick={handleTestSend}
              disabled={!isConfigured || testStatus==="sending"}
              style={{ padding:"10px 20px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"transparent",color:isConfigured?"#6e6e88":"#2a2a3a",fontWeight:600,fontSize:"13px",cursor:isConfigured?"pointer":"default" }}>
              {testStatus==="sending"?"⏳ Enviando...":"📧 Enviar e-mail de teste"}
            </button>
            {testStatus==="ok"  && <span style={{ fontSize:"12px",color:"#22d3a0",fontWeight:600 }}>✅ E-mail de teste enviado!</span>}
            {testStatus==="err" && <span style={{ fontSize:"12px",color:"#ef4444",fontWeight:600 }}>❌ Falha — verifique as credenciais</span>}
          </div>
        </div>
      </div>

      {/* RIGHT – instructions */}
      <div style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
        <div style={card}>
          <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"12px" }}>📋 Como configurar (passo a passo)</h3>
          <ol style={{ margin:0,paddingLeft:"18px",display:"flex",flexDirection:"column",gap:"10px" }}>
            {[
              <>Acesse <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" style={{color:"#6c63ff"}}>emailjs.com</a> e crie uma conta grátis.</>,
              <>Vá em <strong style={{color:"#f0f0fa"}}>Email Services</strong> → conecte seu Gmail ou Outlook → copie o <code style={{color:"#f59e0b",background:"#18181f",padding:"1px 5px",borderRadius:"4px"}}>Service ID</code>.</>,
              <>Vá em <strong style={{color:"#f0f0fa"}}>Email Templates</strong> → crie um novo template com as variáveis ao lado → copie o <code style={{color:"#f59e0b",background:"#18181f",padding:"1px 5px",borderRadius:"4px"}}>Template ID</code>.</>,
              <>Vá em <strong style={{color:"#f0f0fa"}}>Account → API Keys</strong> → copie a <code style={{color:"#f59e0b",background:"#18181f",padding:"1px 5px",borderRadius:"4px"}}>Public Key</code>.</>,
              <>Preencha os campos ao lado, ative o envio e clique em <strong style={{color:"#f0f0fa"}}>Salvar</strong>.</>,
            ].map((step,i)=>(
              <li key={i} style={{ fontSize:"12px",color:"#6e6e88",lineHeight:"1.6" }}>{step}</li>
            ))}
          </ol>
        </div>

        <div style={card}>
          <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"12px" }}>📄 Template sugerido no EmailJS</h3>
          <p style={{ fontSize:"11px",color:"#6e6e88",marginTop:0,marginBottom:"10px" }}>Configure seu template com estes campos:</p>
          <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
            {[
              ["To Email",  "{{to_email}}",  "E-mail do destinatário (obrigatório)"],
              ["To Name",   "{{to_name}}",   "Nome do destinatário"],
              ["Subject",   "{{assunto}}",   "Assunto gerado automaticamente pelo sistema"],
              ["Content",   "{{corpo}}",     "Corpo HTML gerado automaticamente"],
            ].map(([field,variable,desc])=>(
              <div key={field} style={{ padding:"8px 10px",background:"#0d0d14",borderRadius:"6px",border:"1px solid #18181f" }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"2px" }}>
                  <span style={{ fontSize:"11px",fontWeight:700,color:"#f0f0fa" }}>{field}</span>
                  <code style={{ fontSize:"11px",color:"#f59e0b",background:"#18181f",padding:"1px 6px",borderRadius:"4px" }}>{variable}</code>
                </div>
                <span style={{ fontSize:"10px",color:"#6e6e88" }}>{desc}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:"12px",padding:"8px 10px",background:"#0d0d14",borderRadius:"6px",border:"1px solid #18181f" }}>
            <p style={{ fontSize:"11px",color:"#6e6e88",margin:0,lineHeight:"1.6" }}>
              <strong style={{color:"#f59e0b"}}>Assunto gerado:</strong> "Agenda incluída: Dia 17 — VEDACIT (Março 2026)"<br/>
              <strong style={{color:"#f59e0b"}}>Corpo:</strong> tabela HTML com dia, horário, cliente e atividades.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO DE CADASTROS (Consultores, Clientes, Projetos)
// ─────────────────────────────────────────────────────────────────────────────
function CadastrosView({ consultores, clients, projects, onAddConsultor, onRemoveConsultor, onUpdateConsultor, onAddClient, onRemoveClient, onUpdateClient, onAddProject, onRemoveProject, onUpdateProject, emailConfig, onSaveEmailConfig }) {
  const [tab, setTab] = useState("consultores");

  // ── Consultor form ──
  const [newC, setNewC] = useState({ name:"", codigo:"", email:"" });
  const [editC, setEditC] = useState(null); // { idx, name, codigo, email }

  // ── Cliente form ──
  const [newCl, setNewCl] = useState({ name:"", codigo:"", email:"", color:"#6c63ff" });
  const [editCl, setEditCl] = useState(null);

  // ── Projeto form ──
  const [newP, setNewP] = useState({ name:"", codigo:"", client:"", description:"" });
  const [editP, setEditP] = useState(null);

  const inp = { padding:"8px 12px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",width:"100%",boxSizing:"border-box" };
  const lbl = { fontSize:"12px",color:"#6e6e88",fontWeight:600,display:"block",marginBottom:"6px" };
  const card = { background:"#18181f",borderRadius:"12px",padding:"20px",border:"1px solid #2a2a3a" };
  const btnGreen = { padding:"10px",borderRadius:"8px",border:"none",background:"#22d3a0",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:"13px",width:"100%" };
  const btnBlue  = { padding:"10px",borderRadius:"8px",border:"none",background:"#6c63ff",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:"13px",width:"100%" };
  const btnRed   = { background:"#ef444422",border:"1px solid #ef444444",color:"#ef4444",borderRadius:"6px",padding:"5px 10px",cursor:"pointer",fontSize:"12px",fontWeight:600 };
  const btnEdit  = { background:"#6c63ff22",border:"1px solid #3b82f644",color:"#6c63ff",borderRadius:"6px",padding:"5px 10px",cursor:"pointer",fontSize:"12px",fontWeight:600 };

  const tabs = [["consultores","👥 Consultores"],["clientes","🏢 Clientes"],["projetos","📋 Projetos"],["grade","🎓 Grade de Conhecimento"],["email","📧 E-mail"]];
  const [gradeConsultor, setGradeConsultor] = React.useState(consultores[0]||"");

  // Enriquece consultores com meta se disponível
  const consultoresMeta = (window.__consultoresMeta||[]);
  const getMeta = (name) => consultoresMeta.find(c=>c.name===name) || { name, codigo:"", email:"" };

  return (
    <div>
      <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:700,color:"#f0f0fa",marginBottom:"20px" }}>🗂 Cadastros</h2>
      <div style={{ display:"flex",gap:"8px",marginBottom:"24px",flexWrap:"wrap" }}>
        {tabs.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:"8px 20px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"13px",background:tab===id?"#3b82f6":"#18181f",color:tab===id?"#fff":"#6e6e88" }}>{label}</button>
        ))}
      </div>

      {/* ─────────── CONSULTORES ─────────── */}
      {tab==="consultores" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px" }}>
          {/* Formulário */}
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>
              {editC ? "✏️ Editar Consultor" : "➕ Novo Consultor"}
            </h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
              <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:"10px" }}>
                <div>
                  <label style={lbl}>Nome completo</label>
                  <input value={editC?editC.name:newC.name} onChange={e=>editC?setEditC(v=>({...v,name:e.target.value})):setNewC(v=>({...v,name:e.target.value}))} placeholder="Ex: João Silva" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Código</label>
                  <input value={editC?editC.codigo:newC.codigo} onChange={e=>editC?setEditC(v=>({...v,codigo:e.target.value})):setNewC(v=>({...v,codigo:e.target.value}))} placeholder="Ex: C001" style={inp}/>
                </div>
              </div>
              <div>
                <label style={lbl}>E-mail</label>
                <input type="email" value={editC?editC.email:newC.email} onChange={e=>editC?setEditC(v=>({...v,email:e.target.value})):setNewC(v=>({...v,email:e.target.value}))} placeholder="consultor@empresa.com" style={inp}/>
              </div>
              <div style={{ display:"flex",gap:"8px" }}>
                {editC ? (
                  <>
                    <button onClick={()=>{ if(!editC.name.trim()) return; onUpdateConsultor(editC._orig, editC); setEditC(null); }} style={btnBlue}>💾 Salvar alterações</button>
                    <button onClick={()=>setEditC(null)} style={{ ...btnBlue,background:"#2a2a3a",width:"auto",padding:"10px 16px" }}>Cancelar</button>
                  </>
                ) : (
                  <button onClick={()=>{ if(!newC.name.trim()) return; onAddConsultor(newC); setNewC({name:"",codigo:"",email:""}); }} style={btnGreen}>✅ Cadastrar Consultor</button>
                )}
              </div>
            </div>
          </div>

          {/* Lista */}
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>👥 Consultores Cadastrados ({consultores.length})</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"8px",maxHeight:"360px",overflowY:"auto" }}>
              {consultores.map((c,i)=>{
                const meta = getMeta(c);
                return (
                  <div key={c} style={{ padding:"10px 12px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #18181f" }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:"10px",minWidth:0 }}>
                        <div style={{ width:"32px",height:"32px",borderRadius:"50%",background:"hsl("+(i*29%360)+",65%,50%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,color:"#fff",flexShrink:0 }}>{getInitials(c)}</div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:"13px",color:"#c8c8d8",fontWeight:600,display:"flex",alignItems:"center",gap:"6px" }}>
                            {c}
                            {meta.codigo && <span style={{ fontSize:"10px",background:"#2a2a3a",color:"#6e6e88",padding:"1px 6px",borderRadius:"10px" }}>{meta.codigo}</span>}
                          </div>
                          {meta.email && <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>✉️ {meta.email}</div>}
                        </div>
                      </div>
                      <div style={{ display:"flex",gap:"6px",flexShrink:0,marginLeft:"8px" }}>
                        <button onClick={()=>setEditC({...meta,_orig:c})} style={btnEdit}>✏️</button>
                        <button onClick={()=>{ if(window.confirm("Remover "+c+"? Todos os agendamentos serão perdidos.")) onRemoveConsultor(c); }} style={btnRed}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────── CLIENTES ─────────── */}
      {tab==="clientes" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px" }}>
          {/* Formulário */}
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>
              {editCl ? "✏️ Editar Cliente" : "➕ Novo Cliente"}
            </h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
              <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:"10px" }}>
                <div>
                  <label style={lbl}>Nome do cliente</label>
                  <input value={editCl?editCl.name:newCl.name} onChange={e=>{ const v=e.target.value.toUpperCase(); editCl?setEditCl(x=>({...x,name:v})):setNewCl(x=>({...x,name:v})); }} placeholder="Ex: EMPRESA SA" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Código</label>
                  <input value={editCl?editCl.codigo:newCl.codigo} onChange={e=>editCl?setEditCl(x=>({...x,codigo:e.target.value})):setNewCl(x=>({...x,codigo:e.target.value}))} placeholder="Ex: CLI01" style={inp}/>
                </div>
              </div>
              <div>
                <label style={lbl}>E-mail</label>
                <input type="email" value={editCl?editCl.email:newCl.email} onChange={e=>editCl?setEditCl(x=>({...x,email:e.target.value})):setNewCl(x=>({...x,email:e.target.value}))} placeholder="contato@cliente.com" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Cor identificadora</label>
                <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                  <input type="color" value={editCl?editCl.color:newCl.color} onChange={e=>editCl?setEditCl(x=>({...x,color:e.target.value})):setNewCl(x=>({...x,color:e.target.value}))} style={{ width:"48px",height:"36px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#0d0d14",cursor:"pointer" }}/>
                  <div style={{ flex:1,height:"36px",borderRadius:"8px",background:editCl?editCl.color:newCl.color,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <span style={{ fontSize:"12px",fontWeight:700,color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>{(editCl?editCl.name:newCl.name)||"PRÉVIA"}</span>
                  </div>
                </div>
              </div>
              <div style={{ display:"flex",gap:"8px" }}>
                {editCl ? (
                  <>
                    <button onClick={()=>{ if(!editCl.name.trim()) return; onUpdateClient(editCl._orig, editCl); setEditCl(null); }} style={btnBlue}>💾 Salvar alterações</button>
                    <button onClick={()=>setEditCl(null)} style={{ ...btnBlue,background:"#2a2a3a",width:"auto",padding:"10px 16px" }}>Cancelar</button>
                  </>
                ) : (
                  <button onClick={()=>{ if(!newCl.name.trim()) return; onAddClient(newCl); setNewCl({name:"",codigo:"",email:"",color:"#6c63ff"}); }} style={btnGreen}>✅ Cadastrar Cliente</button>
                )}
              </div>
            </div>
          </div>

          {/* Lista */}
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>🏢 Clientes Cadastrados ({clients.length})</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"8px",maxHeight:"380px",overflowY:"auto" }}>
              {clients.map(c=>(
                <div key={c.name} style={{ padding:"10px 12px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #18181f" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"10px",minWidth:0 }}>
                      <div style={{ width:"14px",height:"14px",borderRadius:"3px",background:c.color,flexShrink:0 }}/>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:"13px",color:"#c8c8d8",fontWeight:600,display:"flex",alignItems:"center",gap:"6px" }}>
                          {c.name}
                          {c.codigo && <span style={{ fontSize:"10px",background:"#2a2a3a",color:"#6e6e88",padding:"1px 6px",borderRadius:"10px" }}>{c.codigo}</span>}
                        </div>
                        {c.email && <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>✉️ {c.email}</div>}
                      </div>
                    </div>
                    <div style={{ display:"flex",gap:"6px",flexShrink:0,marginLeft:"8px" }}>
                      <button onClick={()=>setEditCl({...c,_orig:c.name})} style={btnEdit}>✏️</button>
                      <button onClick={()=>onRemoveClient(c.name)} style={btnRed}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────── PROJETOS ─────────── */}
      {tab==="projetos" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px" }}>
          {/* Formulário */}
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>
              {editP ? "✏️ Editar Projeto" : "➕ Novo Projeto"}
            </h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
              <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:"10px" }}>
                <div>
                  <label style={lbl}>Nome do projeto</label>
                  <input value={editP?editP.name:newP.name} onChange={e=>editP?setEditP(v=>({...v,name:e.target.value})):setNewP(v=>({...v,name:e.target.value}))} placeholder="Ex: Implantação Módulo Fiscal" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Código</label>
                  <input value={editP?editP.codigo:newP.codigo} onChange={e=>editP?setEditP(v=>({...v,codigo:e.target.value})):setNewP(v=>({...v,codigo:e.target.value}))} placeholder="Ex: P001" style={inp}/>
                </div>
              </div>
              <div>
                <label style={lbl}>Cliente</label>
                <select value={editP?editP.client:newP.client} onChange={e=>editP?setEditP(v=>({...v,client:e.target.value})):setNewP(v=>({...v,client:e.target.value}))} style={inp}>
                  <option value="">Selecione o cliente...</option>
                  {clients.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Descrição (opcional)</label>
                <input value={editP?editP.description:newP.description} onChange={e=>editP?setEditP(v=>({...v,description:e.target.value})):setNewP(v=>({...v,description:e.target.value}))} placeholder="Breve descrição do projeto..." style={inp}/>
              </div>
              <div style={{ display:"flex",gap:"8px" }}>
                {editP ? (
                  <>
                    <button onClick={()=>{ if(!editP.name.trim()||!editP.client) return; onUpdateProject(editP._idx,editP); setEditP(null); }} style={btnBlue}>💾 Salvar alterações</button>
                    <button onClick={()=>setEditP(null)} style={{ ...btnBlue,background:"#2a2a3a",width:"auto",padding:"10px 16px" }}>Cancelar</button>
                  </>
                ) : (
                  <button onClick={()=>{ if(!newP.name.trim()||!newP.client) return; onAddProject({...newP}); setNewP({name:"",codigo:"",client:"",description:""}); }} style={btnGreen}>✅ Cadastrar Projeto</button>
                )}
              </div>
            </div>
          </div>

          {/* Lista */}
          <div style={card}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"16px" }}>📋 Projetos Cadastrados ({projects.length})</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"8px",maxHeight:"380px",overflowY:"auto" }}>
              {projects.length===0 && <p style={{ color:"#6e6e88",fontSize:"13px",textAlign:"center",padding:"20px" }}>Nenhum projeto cadastrado ainda.</p>}
              {projects.map((p,i)=>(
                <div key={i} style={{ padding:"10px 14px",background:"#0d0d14",borderRadius:"8px",border:"1px solid #18181f" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px" }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:"13px",color:"#f0f0fa",fontWeight:700,display:"flex",alignItems:"center",gap:"6px" }}>
                        {p.name}
                        {p.codigo && <span style={{ fontSize:"10px",background:"#2a2a3a",color:"#6e6e88",padding:"1px 6px",borderRadius:"10px" }}>{p.codigo}</span>}
                      </div>
                      <div style={{ fontSize:"11px",color:getClientColor(p.client),fontWeight:600,marginTop:"3px" }}>{p.client}</div>
                      {p.description && <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"4px" }}>{p.description}</div>}
                    </div>
                    <div style={{ display:"flex",gap:"6px",flexShrink:0 }}>
                      <button onClick={()=>setEditP({...p,_idx:i})} style={btnEdit}>✏️</button>
                      <button onClick={()=>onRemoveProject(i)} style={btnRed}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────── GRADE DE CONHECIMENTO CONSULTORES ─────────── */}
      {tab==="grade" && (
        <GradeAdminView consultores={consultores}/>
      )}

      {/* ─────────── E-MAIL ─────────── */}
      {tab==="email" && (
        <EmailConfigTab emailConfig={emailConfig||{}} onSave={onSaveEmailConfig}/>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADE ADMIN VIEW — busca por produto/módulo + visualização por consultor
// ─────────────────────────────────────────────────────────────────────────────
function GradeAdminView({ consultores }) {
  const [modo, setModo] = React.useState("consultor"); // "consultor" | "busca"
  const [gradeConsultor, setGradeConsultor] = React.useState(consultores[0]||"");

  // Busca
  const [filtroProduto, setFiltroProduto] = React.useState("");
  const [filtroModulo, setFiltroModulo]   = React.useState("");
  const [resultados, setResultados]       = React.useState(null); // null = ainda não buscou
  const [buscando, setBuscando]           = React.useState(false);

  const makeKey = (name) =>
    "grade_" + (name||"").trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"").slice(0,80);

  // Módulos disponíveis para o produto selecionado
  const modulosDoProduto = React.useMemo(() => {
    if (!filtroProduto) {
      // todos os módulos de todos os produtos
      return TOTVS_PRODUTOS.flatMap(p =>
        (TOTVS_MODULOS[p]||[]).map(m => ({ ...m, produto: p }))
      );
    }
    return (TOTVS_MODULOS[filtroProduto]||[]).map(m => ({ ...m, produto: filtroProduto }));
  }, [filtroProduto]);

  const handleBuscar = async () => {
    setBuscando(true);
    setResultados(null);
    try {
      // Carregar grades de todos os consultores em paralelo
      const grades = await Promise.all(
        consultores.map(async (nome) => {
          try {
            const snap = await getDoc(doc(db, "app_data", makeKey(nome)));
            const val = snap.exists() ? (snap.data().value || {}) : {};
            return { nome, modulos: val.modulos || {}, produtos: val.produtos || [] };
          } catch { return { nome, modulos: {}, produtos: [] }; }
        })
      );

      // Filtrar por produto e/ou módulo
      const res = [];
      for (const g of grades) {
        const entries = Object.entries(g.modulos); // [modId, nivel]
        for (const [modId, nivel] of entries) {
          // Encontrar o módulo em TOTVS_MODULOS
          let modInfo = null, produtoMod = null;
          for (const p of TOTVS_PRODUTOS) {
            const m = (TOTVS_MODULOS[p]||[]).find(x => x.id === modId);
            if (m) { modInfo = m; produtoMod = p; break; }
          }
          if (!modInfo) continue;
          // Aplicar filtros
          if (filtroProduto && produtoMod !== filtroProduto) continue;
          if (filtroModulo && modInfo.id !== filtroModulo) continue;
          res.push({ consultor: g.nome, produto: produtoMod, modId, label: modInfo.label, desc: modInfo.desc, nivel });
        }
      }

      // Agrupar por produto > módulo > consultores
      const agrupado = {};
      for (const r of res) {
        if (!agrupado[r.produto]) agrupado[r.produto] = {};
        if (!agrupado[r.produto][r.modId]) agrupado[r.produto][r.modId] = { label: r.label, desc: r.desc, consultores: [] };
        agrupado[r.produto][r.modId].consultores.push({ nome: r.consultor, nivel: r.nivel });
      }
      setResultados(agrupado);
    } catch(e) {
      setResultados({});
    } finally {
      setBuscando(false);
    }
  };

  const nivelInfo = (id) => NIVEIS.find(n => n.id === id) || { label: id, color: "#6e6e88", bg: "#6e6e8822" };
  const nivelOrder = { especialista: 0, senior: 1, pleno: 2, junior: 3 };

  const inp  = { padding:"8px 14px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",fontFamily:"inherit",cursor:"pointer",outline:"none" };

  const totalConsultores = resultados ? new Set(
    Object.values(resultados).flatMap(mods => Object.values(mods).flatMap(m => m.consultores.map(c => c.nome)))
  ).size : 0;
  const totalModulos = resultados ? Object.values(resultados).reduce((s, mods) => s + Object.keys(mods).length, 0) : 0;

  return (
    <div>
      {/* Header + toggle modo */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"24px",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:"0 0 4px",letterSpacing:"-0.3px" }}>
            🎓 Grade de Conhecimento — Consultores
          </h2>
          <p style={{ fontSize:"12px",color:"#3e3e55",margin:0 }}>Visualize a grade individual ou pesquise por produto/módulo</p>
        </div>
        <div style={{ display:"flex",gap:"2px",background:"#0d0d14",borderRadius:"10px",padding:"3px",border:"1px solid #2a2a3a" }}>
          <button onClick={()=>setModo("consultor")} style={{ padding:"7px 16px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"12px",fontFamily:"inherit",background:modo==="consultor"?"#6c63ff":"transparent",color:modo==="consultor"?"#fff":"#6e6e88" }}>
            👤 Por consultor
          </button>
          <button onClick={()=>setModo("busca")} style={{ padding:"7px 16px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"12px",fontFamily:"inherit",background:modo==="busca"?"#6c63ff":"transparent",color:modo==="busca"?"#fff":"#6e6e88" }}>
            🔍 Buscar por produto/módulo
          </button>
        </div>
      </div>

      {/* MODO: Por consultor */}
      {modo==="consultor" && (
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px",flexWrap:"wrap" }}>
            <span style={{ fontSize:"12px",color:"#6e6e88",fontWeight:600 }}>Visualizar grade de:</span>
            <select value={gradeConsultor} onChange={e=>setGradeConsultor(e.target.value)} style={inp}>
              {consultores.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <GradeConhecimento consultorName={gradeConsultor} userId={null} readOnly={true}/>
        </div>
      )}

      {/* MODO: Busca por produto/módulo */}
      {modo==="busca" && (
        <div>
          {/* Filtros */}
          <div style={{ background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e",padding:"20px",marginBottom:"20px" }}>
            <div style={{ fontSize:"11px",color:"#3e3e55",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"14px" }}>Filtros de busca</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:"12px",alignItems:"end",flexWrap:"wrap" }}>
              {/* Produto */}
              <div>
                <label style={{ fontSize:"11px",color:"#6e6e88",fontWeight:600,display:"block",marginBottom:"6px",letterSpacing:"0.3px" }}>Produto TOTVS</label>
                <select value={filtroProduto} onChange={e=>{ setFiltroProduto(e.target.value); setFiltroModulo(""); setResultados(null); }} style={{...inp, width:"100%"}}>
                  <option value="">Todos os produtos</option>
                  {TOTVS_PRODUTOS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {/* Módulo */}
              <div>
                <label style={{ fontSize:"11px",color:"#6e6e88",fontWeight:600,display:"block",marginBottom:"6px",letterSpacing:"0.3px" }}>Módulo específico</label>
                <select value={filtroModulo} onChange={e=>{ setFiltroModulo(e.target.value); setResultados(null); }} style={{...inp, width:"100%"}}>
                  <option value="">Todos os módulos</option>
                  {modulosDoProduto.map(m=>(
                    <option key={m.id} value={m.id}>{m.produto !== filtroProduto && !filtroProduto ? `[${m.produto}] ` : ""}{m.label} — {m.desc}</option>
                  ))}
                </select>
              </div>
              {/* Botão buscar */}
              <button onClick={handleBuscar} disabled={buscando}
                style={{ padding:"9px 24px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"13px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44",whiteSpace:"nowrap",height:"38px" }}>
                {buscando?"⏳ Buscando...":"🔍 Buscar"}
              </button>
            </div>
          </div>

          {/* Resultados */}
          {buscando && (
            <div style={{ textAlign:"center",padding:"48px",color:"#3e3e55" }}>
              <div style={{ width:"32px",height:"32px",border:"3px solid #1f1f2e",borderTop:"3px solid #6c63ff",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto 14px" }}/>
              <div style={{ fontSize:"13px" }}>Carregando grades de todos os consultores...</div>
            </div>
          )}

          {!buscando && resultados !== null && totalModulos === 0 && (
            <div style={{ textAlign:"center",padding:"48px",background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e" }}>
              <div style={{ fontSize:"36px",marginBottom:"12px" }}>🔍</div>
              <div style={{ fontSize:"14px",color:"#3e3e55" }}>Nenhum consultor cadastrou conhecimento neste produto/módulo ainda.</div>
            </div>
          )}

          {!buscando && resultados !== null && totalModulos > 0 && (
            <div>
              {/* Resumo */}
              <div style={{ display:"flex",gap:"16px",marginBottom:"16px",flexWrap:"wrap" }}>
                <div style={{ padding:"8px 16px",borderRadius:"10px",background:"#6c63ff18",border:"1px solid #6c63ff33",display:"flex",alignItems:"center",gap:"8px" }}>
                  <span style={{ fontSize:"18px" }}>👥</span>
                  <div>
                    <div style={{ fontSize:"18px",fontWeight:800,color:"#a78bfa" }}>{totalConsultores}</div>
                    <div style={{ fontSize:"10px",color:"#6e6e88" }}>consultor{totalConsultores!==1?"es":""}</div>
                  </div>
                </div>
                <div style={{ padding:"8px 16px",borderRadius:"10px",background:"#22d3a018",border:"1px solid #22d3a033",display:"flex",alignItems:"center",gap:"8px" }}>
                  <span style={{ fontSize:"18px" }}>📋</span>
                  <div>
                    <div style={{ fontSize:"18px",fontWeight:800,color:"#22d3a0" }}>{totalModulos}</div>
                    <div style={{ fontSize:"10px",color:"#6e6e88" }}>módulo{totalModulos!==1?"s":""} encontrado{totalModulos!==1?"s":""}</div>
                  </div>
                </div>
              </div>

              {/* Por produto */}
              {Object.entries(resultados).map(([produto, mods])=>(
                <div key={produto} style={{ marginBottom:"20px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px" }}>
                    <div style={{ padding:"4px 12px",borderRadius:"99px",background:"#6c63ff22",border:"1px solid #6c63ff44" }}>
                      <span style={{ fontSize:"12px",fontWeight:700,color:"#a78bfa" }}>{produto}</span>
                    </div>
                    <span style={{ fontSize:"11px",color:"#3e3e55" }}>{Object.keys(mods).length} módulo{Object.keys(mods).length!==1?"s":""}</span>
                  </div>

                  <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
                    {Object.entries(mods).map(([modId, info])=>{
                      const sorted = [...info.consultores].sort((a,b) => (nivelOrder[a.nivel]??9)-(nivelOrder[b.nivel]??9));
                      return (
                        <div key={modId} style={{ background:"#111118",borderRadius:"12px",border:"1px solid #1f1f2e",padding:"14px 16px" }}>
                          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px",flexWrap:"wrap" }}>
                            <div>
                              <div style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>{info.label}</div>
                              <div style={{ fontSize:"11px",color:"#3e3e55",marginTop:"2px" }}>{info.desc}</div>
                            </div>
                            <div style={{ display:"flex",gap:"6px",flexWrap:"wrap",justifyContent:"flex-end" }}>
                              {sorted.map(({nome,nivel})=>{
                                const nv = nivelInfo(nivel);
                                return (
                                  <div key={nome} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"5px 10px",borderRadius:"8px",background:nv.bg,border:"1px solid "+nv.color+"44" }}>
                                    <div style={{ width:"20px",height:"20px",borderRadius:"6px",background:`hsl(${(consultores.indexOf(nome)*37)%360},55%,48%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:800,color:"#fff",flexShrink:0 }}>
                                      {nome.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize:"11px",fontWeight:600,color:"#c8c8d8" }}>{nome.split(" ")[0]}</span>
                                    <span style={{ fontSize:"10px",fontWeight:700,color:nv.color,padding:"1px 6px",borderRadius:"99px",background:nv.bg }}>{nv.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {resultados === null && !buscando && (
            <div style={{ textAlign:"center",padding:"48px",background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e" }}>
              <div style={{ fontSize:"36px",marginBottom:"12px" }}>🎯</div>
              <div style={{ fontSize:"14px",color:"#3e3e55" }}>Selecione os filtros e clique em <strong style={{ color:"#a78bfa" }}>Buscar</strong> para ver quais consultores possuem o conhecimento</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADE DE CONHECIMENTO TOTVS (componente do consultor)
// ─────────────────────────────────────────────────────────────────────────────

const TOTVS_PRODUTOS = ["Protheus","RM","Datasul","Fluig"];

const TOTVS_GRUPOS = {
  Protheus: {
    // Backoffice / Administrativo
    "SIGAATF":"Backoffice / Administrativo", "SIGACOM":"Backoffice / Administrativo",
    "SIGAEST":"Backoffice / Administrativo", "SIGAFAT":"Backoffice / Administrativo",
    "SIGAFIN":"Backoffice / Administrativo", "SIGACTB":"Backoffice / Administrativo",
    "SIGAFIS":"Backoffice / Administrativo", "SIGAPCO":"Backoffice / Administrativo",
    // Comercial / Vendas
    "SIGAOMS":"Comercial / Vendas", "SIGATMK":"Comercial / Vendas",
    "SIGALOJA":"Comercial / Vendas","SIGAFRT":"Comercial / Vendas",
    "SIGACTR":"Comercial / Vendas",
    // Logística
    "SIGAWMS":"Logística", "SIGATMS":"Logística",
    // Manufatura / Produção
    "SIGAPCP":"Manufatura / Produção", "SIGAMNT":"Manufatura / Produção",
    "SIGAOFI":"Manufatura / Produção", "SIGACFG":"Manufatura / Produção",
    "SIGAMES":"Manufatura / Produção",
    // Qualidade
    "SIGAQIE":"Qualidade", "SIGAQIP":"Qualidade", "SIGAQMT":"Qualidade",
    "SIGAQNC":"Qualidade", "SIGAQAD":"Qualidade", "SIGAQCP":"Qualidade",
    "SIGAQDO":"Qualidade",
    // Recursos Humanos
    "SIGAGPE":"Recursos Humanos", "SIGAPON":"Recursos Humanos",
    "SIGARSP":"Recursos Humanos", "SIGATRM":"Recursos Humanos",
    "SIGACSA":"Recursos Humanos", "SIGAPLS":"Recursos Humanos",
    "SIGATCF":"Recursos Humanos",
    // Serviços e Projetos
    "SIGATEC":"Serviços e Projetos", "SIGAPMS":"Serviços e Projetos",
    "SIGAENG":"Serviços e Projetos",
    // Comércio Exterior
    "SIGAEIC":"Comércio Exterior", "SIGAEXP":"Comércio Exterior",
    // Outros
    "SIGAVEI":"Outros módulos específicos", "SIGAFRO":"Outros módulos específicos",
    "SIGAAGR":"Outros módulos específicos", "SIGASAU":"Outros módulos específicos",
    "SIGALOG":"Outros módulos específicos",
  },
  RM: {
    // Backoffice / Administrativo & Controladoria
    "RM_NUC": "Backoffice / Administrativo & Controladoria",
    "RM_FLX": "Backoffice / Administrativo & Controladoria",
    "RM_SAL": "Backoffice / Administrativo & Controladoria",
    "RM_LIB": "Backoffice / Administrativo & Controladoria",
    "RM_BON": "Backoffice / Administrativo & Controladoria",
    "RM_FAC": "Backoffice / Administrativo & Controladoria",
    "RM_OFC": "Backoffice / Administrativo & Controladoria",
    "RM_SOL": "Backoffice / Administrativo & Controladoria",
    // Comercial / Relacionamento
    "RM_AGL": "Comercial / Relacionamento",
    "RM_POR": "Comercial / Relacionamento",
    // Recursos Humanos
    "RM_LAB": "Recursos Humanos",
    "RM_VIT": "Recursos Humanos",
    "RM_CHR": "Recursos Humanos",
    "RM_TES": "Recursos Humanos",
    "RM_TRN": "Recursos Humanos",
    // Educacional
    "RM_CLS": "Educacional",
    "RM_BIB": "Educacional",
    // Saúde
    "RM_SAU": "Saúde (vertical)",
    "RM_PLA": "Saúde (vertical)",
    // Verticais / Especializados
    "RM_SGI": "Verticais / Especializados",
    // Business Intelligence & Portais
    "RM_BIS": "Business Intelligence & Portais",
    "RM_POR2":"Business Intelligence & Portais",
    // Infraestrutura / Plataforma
    "RM_REP": "Infraestrutura / Plataforma",
    "RM_FWK": "Infraestrutura / Plataforma",
    "RM_EAI": "Infraestrutura / Plataforma",
  },
  Datasul: {
    // Financeiro
    "DS_APB":  "Financeiro", "DS_ACR":  "Financeiro", "DS_CMG":  "Financeiro",
    "DS_CFL":  "Financeiro", "DS_APL":  "Financeiro", "DS_COB":  "Financeiro", "DS_TES":  "Financeiro",
    // Controladoria / Contabilidade
    "DS_FGL":  "Controladoria / Contabilidade", "DS_MGL":  "Controladoria / Contabilidade",
    "DS_MCT":  "Controladoria / Contabilidade", "DS_ASC":  "Controladoria / Contabilidade",
    "DS_BUC":  "Controladoria / Contabilidade", "DS_FAS":  "Controladoria / Contabilidade",
    "DS_ORC":  "Controladoria / Contabilidade",
    // Fiscal / Tributário
    "DS_OBF":  "Fiscal / Tributário", "DS_CFG":  "Fiscal / Tributário",
    "DS_RECI": "Fiscal / Tributário", "DS_TAX":  "Fiscal / Tributário",
    // Logística / Suprimentos
    "DS_COM":  "Logística / Suprimentos", "DS_EST":  "Logística / Suprimentos",
    "DS_RECV": "Logística / Suprimentos", "DS_AVF":  "Logística / Suprimentos",
    "DS_COT":  "Logística / Suprimentos", "DS_CTR":  "Logística / Suprimentos",
    // Faturamento / Comercial
    "DS_FAT":  "Faturamento / Comercial", "DS_PED":  "Faturamento / Comercial",
    "DS_EMB":  "Faturamento / Comercial", "DS_CRM":  "Faturamento / Comercial",
    // Comércio Exterior
    "DS_IMP":  "Comércio Exterior", "DS_EXP":  "Comércio Exterior",
    "DS_DRB":  "Comércio Exterior", "DS_CAM":  "Comércio Exterior",
    // Manufatura / Produção
    "DS_ENG":  "Manufatura / Produção", "DS_MRP":  "Manufatura / Produção",
    "DS_APS":  "Manufatura / Produção", "DS_CPR":  "Manufatura / Produção",
    "DS_CFB":  "Manufatura / Produção", "DS_CDP":  "Manufatura / Produção",
    "DS_CST":  "Manufatura / Produção", "DS_QUAL": "Manufatura / Produção",
    "DS_MET":  "Manufatura / Produção", "DS_MES":  "Manufatura / Produção",
    "DS_CFGP": "Manufatura / Produção", "DS_DPR":  "Manufatura / Produção",
    "DS_MAN":  "Manufatura / Produção",
    // Recursos Humanos
    "DS_HCM":  "Recursos Humanos", "DS_FOP":  "Recursos Humanos",
    "DS_ORG":  "Recursos Humanos", "DS_PJT":  "Recursos Humanos",
    // Verticais — Agronegócio
    "DS_GRA":  "Verticais — Agronegócio",
    // Verticais — Frotas
    "DS_FRO":  "Verticais — Frotas",
    // Verticais — Saúde
    "DS_HOSP": "Verticais — Saúde", "DS_BENE": "Verticais — Saúde", "DS_CMED": "Verticais — Saúde",
    // Ferramentas / Plataforma
    "DS_TEC":  "Ferramentas / Plataforma", "DS_EAI":  "Ferramentas / Plataforma",
    "DS_BI":   "Ferramentas / Plataforma", "DS_SMA":  "Ferramentas / Plataforma",
  },
  Fluig: {
    // ECM
    "FL_ECM_DOC":  "ECM – Gestão de Documentos", "FL_ECM_VER":  "ECM – Gestão de Documentos",
    "FL_ECM_PER":  "ECM – Gestão de Documentos", "FL_ECM_DIG":  "ECM – Gestão de Documentos",
    "FL_ECM_ASS":  "ECM – Gestão de Documentos", "FL_ECM_META": "ECM – Gestão de Documentos",
    // BPM
    "FL_BPM_MOD":  "BPM – Gestão de Processos",  "FL_BPM_WFL":  "BPM – Gestão de Processos",
    "FL_BPM_FORM": "BPM – Gestão de Processos",  "FL_BPM_SLA":  "BPM – Gestão de Processos",
    "FL_BPM_AUTO": "BPM – Gestão de Processos",
    // WCM
    "FL_WCM_PORT": "WCM – Portais e Intranet",   "FL_WCM_INT":  "WCM – Portais e Intranet",
    "FL_WCM_WID":  "WCM – Portais e Intranet",   "FL_WCM_COLAB":"WCM – Portais e Intranet",
    "FL_WCM_FORN": "WCM – Portais e Intranet",
    // Social
    "FL_SOC_FEED": "Social / Colaboração",        "FL_SOC_COM":  "Social / Colaboração",
    "FL_SOC_COLAB":"Social / Colaboração",
    // Integração
    "FL_INT_API":  "Integração",                  "FL_INT_ERP":  "Integração",
    "FL_INT_SYNC": "Integração",
    // Identity
    "FL_IDN_USR":  "Identity / Segurança",        "FL_IDN_SSO":  "Identity / Segurança",
    "FL_IDN_AUD":  "Identity / Segurança",
  }
};

const TOTVS_MODULOS = {
  Protheus: [
    // Backoffice / Administrativo
    { id:"SIGAATF",  label:"SIGAATF",  desc:"Ativo Fixo — controle de imobilizado" },
    { id:"SIGACOM",  label:"SIGACOM",  desc:"Compras — gestão de compras" },
    { id:"SIGAEST",  label:"SIGAEST",  desc:"Estoque e Custos — controle de estoque" },
    { id:"SIGAFAT",  label:"SIGAFAT",  desc:"Faturamento — emissão de notas e faturamento" },
    { id:"SIGAFIN",  label:"SIGAFIN",  desc:"Financeiro — contas a pagar/receber" },
    { id:"SIGACTB",  label:"SIGACTB",  desc:"Contabilidade — contabilidade geral" },
    { id:"SIGAFIS",  label:"SIGAFIS",  desc:"Livros Fiscais — escrituração fiscal" },
    { id:"SIGAPCO",  label:"SIGAPCO",  desc:"Planejamento e Controle Orçamentário" },
    // Comercial / Vendas
    { id:"SIGAOMS",  label:"SIGAOMS",  desc:"Order Management System — gestão de pedidos" },
    { id:"SIGATMK",  label:"SIGATMK",  desc:"Telemarketing — televendas e telecobrança" },
    { id:"SIGALOJA", label:"SIGALOJA", desc:"Loja / PDV — operação de lojas" },
    { id:"SIGAFRT",  label:"SIGAFRT",  desc:"Front Loja — frente de caixa" },
    { id:"SIGACTR",  label:"SIGACTR",  desc:"Contratos — gestão de contratos" },
    // Logística
    { id:"SIGAWMS",  label:"SIGAWMS",  desc:"Warehouse Management System — gestão de armazém" },
    { id:"SIGATMS",  label:"SIGATMS",  desc:"Transportation Management — gestão de transporte" },
    // Manufatura / Produção
    { id:"SIGAPCP",  label:"SIGAPCP",  desc:"PCP — Planejamento e Controle de Produção" },
    { id:"SIGAMNT",  label:"SIGAMNT",  desc:"Manutenção — manutenção de ativos" },
    { id:"SIGAOFI",  label:"SIGAOFI",  desc:"Oficina — gestão de oficina" },
    { id:"SIGACFG",  label:"SIGACFG",  desc:"Configurador de produtos" },
    { id:"SIGAMES",  label:"SIGAMES",  desc:"Manufacturing Execution System" },
    // Qualidade
    { id:"SIGAQIE",  label:"SIGAQIE",  desc:"Inspeção de Entradas" },
    { id:"SIGAQIP",  label:"SIGAQIP",  desc:"Inspeção de Processos" },
    { id:"SIGAQMT",  label:"SIGAQMT",  desc:"Metrologia" },
    { id:"SIGAQNC",  label:"SIGAQNC",  desc:"Não conformidades" },
    { id:"SIGAQAD",  label:"SIGAQAD",  desc:"Auditoria" },
    { id:"SIGAQCP",  label:"SIGAQCP",  desc:"Controle estatístico de processo" },
    { id:"SIGAQDO",  label:"SIGAQDO",  desc:"Controle de documentos" },
    // Recursos Humanos
    { id:"SIGAGPE",  label:"SIGAGPE",  desc:"Gestão de Pessoal — folha de pagamento" },
    { id:"SIGAPON",  label:"SIGAPON",  desc:"Ponto Eletrônico" },
    { id:"SIGARSP",  label:"SIGARSP",  desc:"Recrutamento e Seleção" },
    { id:"SIGATRM",  label:"SIGATRM",  desc:"Treinamento" },
    { id:"SIGACSA",  label:"SIGACSA",  desc:"Cargos e salários" },
    { id:"SIGAPLS",  label:"SIGAPLS",  desc:"Plano de saúde" },
    { id:"SIGATCF",  label:"SIGATCF",  desc:"RH Online" },
    // Serviços e Projetos
    { id:"SIGATEC",  label:"SIGATEC",  desc:"Field Service" },
    { id:"SIGAPMS",  label:"SIGAPMS",  desc:"Gestão de Projetos" },
    { id:"SIGAENG",  label:"SIGAENG",  desc:"Engenharia" },
    // Comércio Exterior
    { id:"SIGAEIC",  label:"SIGAEIC",  desc:"Easy Import Control" },
    { id:"SIGAEXP",  label:"SIGAEXP",  desc:"Exportação" },
    // Outros módulos específicos
    { id:"SIGAVEI",  label:"SIGAVEI",  desc:"Gestão de veículos" },
    { id:"SIGAFRO",  label:"SIGAFRO",  desc:"Gestão de frotas" },
    { id:"SIGAAGR",  label:"SIGAAGR",  desc:"Agronegócio" },
    { id:"SIGASAU",  label:"SIGASAU",  desc:"Saúde" },
    { id:"SIGALOG",  label:"SIGALOG",  desc:"Logística avançada" },
  ],
  RM: [
    // Backoffice / Administrativo & Controladoria
    { id:"RM_NUC",  label:"RM Nucleus",   desc:"Estoque, compras, faturamento e contratos" },
    { id:"RM_FLX",  label:"RM Fluxus",    desc:"Gestão financeira, caixa e bancos" },
    { id:"RM_SAL",  label:"RM Saldus",    desc:"Contabilidade gerencial e fiscal" },
    { id:"RM_LIB",  label:"RM Liber",     desc:"Gestão fiscal / tributária e obrigações" },
    { id:"RM_BON",  label:"RM Bonum",     desc:"Ativo imobilizado / patrimônio" },
    { id:"RM_FAC",  label:"RM Factor",    desc:"Planejamento e Controle da Produção (PCP)" },
    { id:"RM_OFC",  label:"RM Officina",  desc:"Manutenção industrial / ativos" },
    { id:"RM_SOL",  label:"RM Solum",     desc:"Construção civil, obras e projetos" },
    // Comercial / Relacionamento
    { id:"RM_AGL",  label:"RM Agilis",    desc:"CRM / gestão de relacionamento com clientes" },
    { id:"RM_POR",  label:"RM Portal",    desc:"Portais corporativos (funcionário, cliente, fornecedor)" },
    // Recursos Humanos
    { id:"RM_LAB",  label:"RM Labore",    desc:"Folha de pagamento" },
    { id:"RM_VIT",  label:"RM Vitae",     desc:"Gestão de pessoas / RH" },
    { id:"RM_CHR",  label:"RM Chronus",   desc:"Controle de ponto eletrônico" },
    { id:"RM_TES",  label:"RM Testis",    desc:"Avaliação de desempenho / pesquisas" },
    { id:"RM_TRN",  label:"RM Training",  desc:"Gestão de treinamento e capacitação" },
    // Educacional
    { id:"RM_CLS",  label:"RM Classis",   desc:"Gestão acadêmica (escolas e universidades)" },
    { id:"RM_BIB",  label:"RM Biblios",   desc:"Controle de acervo e empréstimos" },
    // Saúde (vertical)
    { id:"RM_SAU",  label:"RM Saúde",     desc:"Gestão hospitalar" },
    { id:"RM_PLA",  label:"RM Planos",    desc:"Operadoras de saúde" },
    // Verticais / Especializados
    { id:"RM_SGI",  label:"RM SGI",       desc:"Gestão de empreendimentos imobiliários" },
    // Business Intelligence & Portais
    { id:"RM_BIS",  label:"RM Bis",       desc:"BI / indicadores e dashboards gerenciais" },
    { id:"RM_POR2", label:"RM Portal (BI)",desc:"Portais web (RH, aluno, fornecedor etc.)" },
    // Infraestrutura / Plataforma
    { id:"RM_REP",  label:"RM Reports",   desc:"Geração de relatórios" },
    { id:"RM_FWK",  label:"RM Portal Framework", desc:"Portais web" },
    { id:"RM_EAI",  label:"RM Integrações / EAI", desc:"Integração com outros sistemas TOTVS e ERPs" },
  ],
  Datasul: [
    // Financeiro
    { id:"DS_APB",  label:"APB",          desc:"Contas a Pagar" },
    { id:"DS_ACR",  label:"ACR",          desc:"Contas a Receber" },
    { id:"DS_CMG",  label:"CMG",          desc:"Caixa e Bancos" },
    { id:"DS_CFL",  label:"CFL",          desc:"Fluxo de Caixa" },
    { id:"DS_APL",  label:"APL",          desc:"Aplicações e Empréstimos" },
    { id:"DS_COB",  label:"COB",          desc:"Cobrança" },
    { id:"DS_TES",  label:"TES",          desc:"Tesouraria" },
    // Controladoria / Contabilidade
    { id:"DS_FGL",  label:"FGL",          desc:"Contabilidade Fiscal" },
    { id:"DS_MGL",  label:"MGL",          desc:"Contabilidade Gerencial" },
    { id:"DS_MCT",  label:"MCT",          desc:"Contabilidade" },
    { id:"DS_ASC",  label:"ASC",          desc:"Cenários Contábeis" },
    { id:"DS_BUC",  label:"BUC",          desc:"Unidade de Negócio" },
    { id:"DS_FAS",  label:"FAS",          desc:"Ativo Fixo" },
    { id:"DS_ORC",  label:"ORC",          desc:"Orçamento" },
    // Fiscal / Tributário
    { id:"DS_OBF",  label:"OBF",          desc:"Obrigações Fiscais" },
    { id:"DS_CFG",  label:"CFG",          desc:"Configurador Fiscal" },
    { id:"DS_RECI", label:"REC",          desc:"Recuperação de Impostos" },
    { id:"DS_TAX",  label:"TAX",          desc:"Configurador de Tributos" },
    // Logística / Suprimentos
    { id:"DS_COM",  label:"COM",          desc:"Compras" },
    { id:"DS_EST",  label:"EST",          desc:"Estoque" },
    { id:"DS_RECV", label:"REC",          desc:"Recebimento" },
    { id:"DS_AVF",  label:"AVF",          desc:"Avaliação de Fornecedores" },
    { id:"DS_COT",  label:"COT",          desc:"Cotações de Compras" },
    { id:"DS_CTR",  label:"CTR",          desc:"Contratos de Compras" },
    // Faturamento / Comercial
    { id:"DS_FAT",  label:"FAT",          desc:"Faturamento" },
    { id:"DS_PED",  label:"PED",          desc:"Pedidos de Venda" },
    { id:"DS_EMB",  label:"EMB",          desc:"Controle de Embarques" },
    { id:"DS_CRM",  label:"CRM",          desc:"Relacionamento com clientes" },
    // Comércio Exterior
    { id:"DS_IMP",  label:"IMP",          desc:"Importação" },
    { id:"DS_EXP",  label:"EXP",          desc:"Exportação" },
    { id:"DS_DRB",  label:"DRB",          desc:"Drawback" },
    { id:"DS_CAM",  label:"CAM",          desc:"Câmbio" },
    // Manufatura / Produção
    { id:"DS_ENG",  label:"ENG",          desc:"Engenharia de Produto" },
    { id:"DS_MRP",  label:"MRP",          desc:"Planejamento de Materiais" },
    { id:"DS_APS",  label:"APS",          desc:"Planejamento Avançado de Produção" },
    { id:"DS_CPR",  label:"CPR",          desc:"Controle de Produção" },
    { id:"DS_CFB",  label:"CFB",          desc:"Chão de Fábrica" },
    { id:"DS_CDP",  label:"CDP",          desc:"Coleta de Dados de Produção" },
    { id:"DS_CST",  label:"CST",          desc:"Custos Industriais" },
    { id:"DS_QUAL", label:"QUAL",         desc:"Controle de Qualidade" },
    { id:"DS_MET",  label:"MET",          desc:"Metrologia" },
    { id:"DS_MES",  label:"MES",          desc:"Manufacturing Execution System" },
    { id:"DS_CFGP", label:"CFG Produtos", desc:"Configurador de Produtos" },
    { id:"DS_DPR",  label:"DPR",          desc:"Desenvolvimento de Produtos" },
    { id:"DS_MAN",  label:"MAN",          desc:"Manutenção Industrial" },
    // Recursos Humanos
    { id:"DS_HCM",  label:"HCM",          desc:"Gestão de Pessoas" },
    { id:"DS_FOP",  label:"FOP",          desc:"Folha de Pagamento" },
    { id:"DS_ORG",  label:"ORG",          desc:"Desenvolvimento Organizacional" },
    { id:"DS_PJT",  label:"PJT",          desc:"Controle de Projetos" },
    // Verticais — Agronegócio
    { id:"DS_GRA",  label:"GRA",          desc:"Gestão de Grãos" },
    // Verticais — Frotas
    { id:"DS_FRO",  label:"FRO",          desc:"Gestão de Frotas" },
    // Verticais — Saúde
    { id:"DS_HOSP", label:"Módulo Hospitalar", desc:"Gestão hospitalar" },
    { id:"DS_BENE", label:"Beneficiários", desc:"Gestão de beneficiários" },
    { id:"DS_CMED", label:"Contas Médicas",desc:"Gestão de contas médicas" },
    // Ferramentas / Plataforma
    { id:"DS_TEC",  label:"TEC",          desc:"Framework Datasul" },
    { id:"DS_EAI",  label:"EAI",          desc:"Integrações" },
    { id:"DS_BI",   label:"BI",           desc:"Business Analytics" },
    { id:"DS_SMA",  label:"SmartView",    desc:"SmartView / Analytics" },
  ],
  Fluig: [
    // ECM – Gestão de Documentos
    { id:"FL_ECM_DOC",  label:"Gestão de Documentos",     desc:"Controle e armazenamento de documentos corporativos" },
    { id:"FL_ECM_VER",  label:"Controle de Versões",      desc:"Versionamento e histórico de documentos" },
    { id:"FL_ECM_PER",  label:"Permissões e Segurança",   desc:"Controle de acesso e segurança de documentos" },
    { id:"FL_ECM_DIG",  label:"Digitalização",            desc:"Digitalização, indexação e busca de documentos" },
    { id:"FL_ECM_ASS",  label:"Assinatura Eletrônica",    desc:"Assinatura e validação eletrônica de documentos" },
    { id:"FL_ECM_META", label:"Metadados e Pastas",       desc:"Organização por pastas, metadados e categorias" },
    // BPM – Gestão de Processos
    { id:"FL_BPM_MOD",  label:"Modelagem de Processos",   desc:"Criação e modelagem de fluxos de trabalho BPMN" },
    { id:"FL_BPM_WFL",  label:"Workflows e Aprovações",   desc:"Automação de aprovações e tarefas sequenciais" },
    { id:"FL_BPM_FORM", label:"Formulários Eletrônicos",  desc:"Criação de formulários digitais para processos" },
    { id:"FL_BPM_SLA",  label:"SLA e Monitoramento",      desc:"Acompanhamento de SLA e indicadores de processos" },
    { id:"FL_BPM_AUTO", label:"Automação de Processos",   desc:"Automação e robotização de fluxos internos" },
    // WCM – Portais e Intranet
    { id:"FL_WCM_PORT", label:"Portais Corporativos",     desc:"Criação e gestão de portais corporativos" },
    { id:"FL_WCM_INT",  label:"Intranet",                 desc:"Intranet e comunicação interna" },
    { id:"FL_WCM_WID",  label:"Widgets e Componentes",    desc:"Páginas personalizadas, widgets e componentes visuais" },
    { id:"FL_WCM_COLAB",label:"Portal do Colaborador",    desc:"Portal do funcionário com autoatendimento" },
    { id:"FL_WCM_FORN", label:"Portal do Fornecedor",     desc:"Portal externo para fornecedores e clientes" },
    // Social / Colaboração
    { id:"FL_SOC_FEED", label:"Feed Corporativo",         desc:"Feed de notícias e comunicação entre equipes" },
    { id:"FL_SOC_COM",  label:"Comunidades",              desc:"Grupos, comunidades e compartilhamento de arquivos" },
    { id:"FL_SOC_COLAB",label:"Colaboração em Equipe",    desc:"Comentários, curtidas e interação interna" },
    // Integração
    { id:"FL_INT_API",  label:"APIs REST",                desc:"Integração via APIs REST com sistemas externos" },
    { id:"FL_INT_ERP",  label:"Integração com ERPs",      desc:"Integração com Protheus, Datasul e RM" },
    { id:"FL_INT_SYNC", label:"Sincronização de Dados",   desc:"Consumo de serviços e sincronização de informações" },
    // Identity / Segurança
    { id:"FL_IDN_USR",  label:"Gestão de Usuários",       desc:"Controle de usuários, grupos e papéis" },
    { id:"FL_IDN_SSO",  label:"Single Sign-On",           desc:"Autenticação centralizada e SSO" },
    { id:"FL_IDN_AUD",  label:"Auditoria de Acessos",     desc:"Logs de auditoria e rastreabilidade de acessos" },
  ],
};

const NIVEIS = [
  { id:"especialista", label:"Especialista", color:"#a78bfa", bg:"#a78bfa22" },
  { id:"senior",       label:"Sênior",       color:"#22d3a0", bg:"#22d3a022" },
  { id:"pleno",        label:"Pleno",        color:"#f5a623", bg:"#f5a62322" },
  { id:"junior",       label:"Júnior",       color:"#6e6e88", bg:"#6e6e8822" },
];

function GradeConhecimento({ consultorName, userId, readOnly }) {
  const [grade, setGrade] = React.useState({});
  const [produtosSel, setProdutosSel] = React.useState(new Set());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [activeProd, setActiveProd] = React.useState("Protheus");
  const [search, setSearch] = React.useState("");
  const [erro, setErro] = React.useState(null);

  // Gera key segura para Firestore (só letras, números e underscore, max 100 chars)
  const makeKey = (name) =>
    "grade_" + (name||"").trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"").slice(0,80);

  // Carregar do Firestore
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setErro(null);
      setGrade({});
      setProdutosSel(new Set());
      if (!consultorName) { setLoading(false); return; }
      try {
        const key = makeKey(consultorName);
        const snap = await getDoc(doc(db, "app_data", key));
        if (cancelled) return;
        if (snap.exists()) {
          const val = snap.data().value || {};
          setGrade(val.modulos || {});
          setProdutosSel(new Set(Array.isArray(val.produtos) ? val.produtos : []));
        }
      } catch(e) {
        if (!cancelled) setErro("Erro ao carregar grade: " + e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [consultorName]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const key = makeKey(consultorName);
      await setDoc(doc(db, "app_data", key), { value: { modulos: grade, produtos: [...produtosSel], atualizadoEm: new Date().toISOString() } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch(e) {
      console.error("Erro ao salvar grade:", e);
    } finally {
      setSaving(false);
    }
  };

  const toggleProduto = (prod) => {
    setProdutosSel(prev => {
      const n = new Set(prev);
      if (n.has(prod)) {
        n.delete(prod);
        // Remove módulos deste produto da grade
        const mods = (TOTVS_MODULOS[prod]||[]).map(m=>m.id);
        setGrade(g => { const ng = {...g}; mods.forEach(id => delete ng[id]); return ng; });
      } else {
        n.add(prod);
      }
      return n;
    });
  };

  const setNivel = (modId, nivel) => {
    setGrade(prev => {
      if (prev[modId] === nivel) { const n={...prev}; delete n[modId]; return n; }
      return {...prev, [modId]: nivel};
    });
  };

  const modulos = (TOTVS_MODULOS[activeProd]||[]).filter(m =>
    !search || m.label.toLowerCase().includes(search.toLowerCase()) || m.desc.toLowerCase().includes(search.toLowerCase())
  );

  const totalConhecimentos = Object.keys(grade).length;
  const nivelCounts = NIVEIS.map(n => ({ ...n, count: Object.values(grade).filter(v=>v===n.id).length }));

  if (loading) return (
    <div style={{ textAlign:"center",padding:"60px",color:"#3e3e55" }}>
      <div style={{ width:"32px",height:"32px",border:"3px solid #1f1f2e",borderTop:"3px solid #6c63ff",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto 16px" }}/>
      <div style={{ fontSize:"13px" }}>Carregando grade de conhecimento...</div>
    </div>
  );

  if (erro) return (
    <div style={{ textAlign:"center",padding:"60px",color:"#f04f5e",background:"#f04f5e10",borderRadius:"16px",border:"1px solid #f04f5e30" }}>
      <div style={{ fontSize:"32px",marginBottom:"12px" }}>⚠️</div>
      <div style={{ fontSize:"13px" }}>{erro}</div>
    </div>
  );

  return (
    <div style={{ maxWidth:"1000px" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"24px",gap:"16px",flexWrap:"wrap" }}>
        <div>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:"0 0 6px",letterSpacing:"-0.3px" }}>
            🎓 Grade de Conhecimento TOTVS
          </h2>
          <p style={{ fontSize:"12px",color:"#3e3e55",margin:0 }}>
            {readOnly ? `Conhecimentos declarados por ${consultorName}` : "Selecione seus produtos e defina o nível em cada módulo"}
          </p>
        </div>
        <div style={{ display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap" }}>
          {/* Resumo por nível */}
          {nivelCounts.filter(n=>n.count>0).map(n=>(
            <div key={n.id} style={{ padding:"5px 12px",borderRadius:"99px",background:n.bg,border:"1px solid "+n.color+"44",display:"flex",alignItems:"center",gap:"6px" }}>
              <span style={{ fontSize:"11px",fontWeight:700,color:n.color }}>{n.count}</span>
              <span style={{ fontSize:"10px",color:n.color,opacity:0.8 }}>{n.label}</span>
            </div>
          ))}
          {!readOnly && (
            <button onClick={handleSave} disabled={saving}
              style={{ padding:"9px 20px",borderRadius:"10px",border:"none",background:saved?"#22d3a0":"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"13px",cursor:"pointer",fontFamily:"inherit",boxShadow:saved?"0 4px 16px #22d3a044":"0 4px 16px #6c63ff44",transition:"all .2s" }}>
              {saving?"⏳ Salvando...":saved?"✅ Salvo!":"💾 Salvar grade"}
            </button>
          )}
        </div>
      </div>

      {/* Seleção de produtos */}
      <div style={{ marginBottom:"20px" }}>
        <div style={{ fontSize:"11px",color:"#3e3e55",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"10px" }}>Produtos com conhecimento</div>
        <div style={{ display:"flex",gap:"10px",flexWrap:"wrap" }}>
          {TOTVS_PRODUTOS.map(prod => {
            const sel = produtosSel.has(prod);
            const count = (TOTVS_MODULOS[prod]||[]).filter(m=>grade[m.id]).length;
            return (
              <div key={prod}
                onClick={()=>!readOnly && toggleProduto(prod)}
                style={{ padding:"10px 18px",borderRadius:"12px",border:"1px solid "+(sel?"#6c63ff":"#2a2a3a"),background:sel?"#6c63ff18":"#111118",cursor:readOnly?"default":"pointer",transition:"all .2s",display:"flex",alignItems:"center",gap:"10px" }}>
                <div style={{ width:"10px",height:"10px",borderRadius:"3px",background:sel?"#6c63ff":"#2a2a3a",transition:"background .2s" }}/>
                <div>
                  <div style={{ fontSize:"13px",fontWeight:700,color:sel?"#a78bfa":"#6e6e88" }}>{prod}</div>
                  {count>0 && <div style={{ fontSize:"10px",color:"#6c63ff",marginTop:"1px" }}>{count} módulo{count>1?"s":""}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {produtosSel.size === 0 && (
        <div style={{ textAlign:"center",padding:"48px 20px",background:"#111118",borderRadius:"16px",border:"1px solid #1f1f2e" }}>
          <div style={{ fontSize:"40px",marginBottom:"12px" }}>🎯</div>
          <div style={{ fontSize:"14px",color:"#3e3e55" }}>Selecione os produtos TOTVS que você conhece para definir seus módulos</div>
        </div>
      )}

      {produtosSel.size > 0 && (
        <div style={{ background:"#111118",borderRadius:"16px",border:"1px solid #1f1f2e",overflow:"hidden" }}>
          {/* Tabs de produto */}
          <div style={{ display:"flex",borderBottom:"1px solid #1f1f2e",background:"#0d0d14",overflowX:"auto" }}>
            {[...produtosSel].map(prod => {
              const count = (TOTVS_MODULOS[prod]||[]).filter(m=>grade[m.id]).length;
              return (
                <button key={prod} onClick={()=>{ setActiveProd(prod); setSearch(""); }}
                  style={{ padding:"12px 20px",border:"none",borderBottom:"2px solid "+(activeProd===prod?"#6c63ff":"transparent"),background:"transparent",color:activeProd===prod?"#a78bfa":"#3e3e55",fontWeight:activeProd===prod?700:400,fontSize:"13px",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"8px",transition:"all .15s" }}>
                  {prod}
                  {count>0&&<span style={{ fontSize:"10px",background:"#6c63ff33",color:"#6c63ff",padding:"1px 7px",borderRadius:"99px",fontWeight:700 }}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Busca módulo */}
          <div style={{ padding:"12px 16px",borderBottom:"1px solid #1f1f2e",display:"flex",alignItems:"center",gap:"8px" }}>
            <div style={{ position:"relative",flex:1,maxWidth:"280px" }}>
              <span style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"12px",color:"#3e3e55",pointerEvents:"none" }}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar módulo..."
                style={{ width:"100%",padding:"7px 10px 7px 30px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"12px",fontFamily:"inherit",outline:"none",boxSizing:"border-box" }}/>
            </div>
            <div style={{ fontSize:"11px",color:"#3e3e55" }}>
              {(TOTVS_MODULOS[activeProd]||[]).filter(m=>grade[m.id]).length} / {(TOTVS_MODULOS[activeProd]||[]).length} módulos preenchidos
            </div>
          </div>

          {/* Legenda de níveis */}
          <div style={{ padding:"10px 16px",borderBottom:"1px solid #1f1f2e",display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center" }}>
            <span style={{ fontSize:"10px",color:"#3e3e55",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",marginRight:"4px" }}>Níveis:</span>
            {NIVEIS.map(n=>(
              <div key={n.id} style={{ display:"flex",alignItems:"center",gap:"4px" }}>
                <div style={{ width:"8px",height:"8px",borderRadius:"2px",background:n.color }}/>
                <span style={{ fontSize:"11px",color:n.color,fontWeight:600 }}>{n.label}</span>
              </div>
            ))}
          </div>

          {/* Tabela de módulos */}
          <div style={{ overflowY:"auto",maxHeight:"480px" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead style={{ position:"sticky",top:0,zIndex:2 }}>
                <tr style={{ background:"#0d0d14" }}>
                  <th style={{ padding:"10px 16px",textAlign:"left",fontSize:"10px",color:"#3e3e55",fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase",width:"40%" }}>Módulo</th>
                  {NIVEIS.map(n=>(
                    <th key={n.id} style={{ padding:"10px 8px",textAlign:"center",fontSize:"10px",color:n.color,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase" }}>{n.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modulos.map((mod,idx)=>{
                  const nivelAtual = grade[mod.id];
                  const grupos = TOTVS_GRUPOS[activeProd];
                  const grupoAtual = grupos?.[mod.id];
                  const grupoAnterior = idx > 0 ? grupos?.[modulos[idx-1].id] : null;
                  const showGrupoHeader = grupoAtual && grupoAtual !== grupoAnterior && !search;
                  return (
                    <React.Fragment key={mod.id}>
                      {showGrupoHeader && (
                        <tr>
                          <td colSpan={5} style={{ padding:"10px 16px 6px",background:"#0d0d14",borderBottom:"1px solid #1f1f2e" }}>
                            <span style={{ fontSize:"10px",fontWeight:700,color:"#6c63ff",letterSpacing:"1px",textTransform:"uppercase" }}>
                              {grupoAtual}
                            </span>
                          </td>
                        </tr>
                      )}
                    <tr style={{ borderBottom:"1px solid #18181f",background:nivelAtual?(NIVEIS.find(n=>n.id===nivelAtual)?.bg||"transparent"):"transparent",transition:"background .15s" }}>
                      <td style={{ padding:"11px 16px" }}>
                        <div style={{ fontSize:"12px",fontWeight:700,color:nivelAtual?"#f0f0fa":"#c8c8d8" }}>{mod.label}</div>
                        <div style={{ fontSize:"11px",color:"#3e3e55",marginTop:"2px" }}>{mod.desc}</div>
                      </td>
                      {NIVEIS.map(n=>{
                        const sel = nivelAtual === n.id;
                        return (
                          <td key={n.id} style={{ padding:"8px",textAlign:"center" }}>
                            <button
                              onClick={()=>!readOnly && setNivel(mod.id, n.id)}
                              style={{ width:"36px",height:"36px",borderRadius:"10px",border:"1px solid "+(sel?n.color:"#2a2a3a"),background:sel?n.bg:"transparent",cursor:readOnly?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto",transition:"all .15s" }}
                              title={n.label}>
                              {sel
                                ? <span style={{ fontSize:"16px",color:n.color }}>●</span>
                                : <span style={{ fontSize:"14px",color:"#2a2a3a" }}>○</span>
                              }
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                    </React.Fragment>
                  );
                })}
                {modulos.length===0&&(
                  <tr><td colSpan={5} style={{ textAlign:"center",padding:"32px",fontSize:"12px",color:"#3e3e55" }}>Nenhum módulo encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUALIZAÇÃO SEMANAL GLOBAL (todos os consultores, semana a semana)
// ─────────────────────────────────────────────────────────────────────────────
function WeeklyGlobalView({ weeklyData, offset, setOffset, clientColorMap, canEdit, onEdit, onNewEntry, theme: T }) {
  const { days, consultores: allConsultores } = weeklyData;
  const WD_SHORT = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
  const today = new Date(); today.setHours(0,0,0,0);

  // ── Filtros internos ──
  const [search, setSearch] = React.useState("");
  const [selConsultores, setSelConsultores] = React.useState(new Set()); // vazio = todos
  const [selClientes, setSelClientes] = React.useState(new Set());       // vazio = todos
  const [showConsFilter, setShowConsFilter] = React.useState(false);
  const [showCliFilter, setShowCliFilter] = React.useState(false);
  const consRef = React.useRef(null);
  const cliRef  = React.useRef(null);

  // Fechar dropdowns ao clicar fora
  React.useEffect(() => {
    const handler = (e) => {
      if (consRef.current && !consRef.current.contains(e.target)) setShowConsFilter(false);
      if (cliRef.current  && !cliRef.current.contains(e.target))  setShowCliFilter(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Coletar todos os clientes únicos da semana
  const allClientes = React.useMemo(() => {
    const set = new Set();
    allConsultores.forEach(({cells}) => cells.forEach(entries => entries.forEach(e => { if(e.client) set.add(e.client); })));
    return [...set].sort();
  }, [allConsultores]);

  // Aplicar filtros
  const consultores = React.useMemo(() => {
    return allConsultores
      .filter(({name}) => {
        if (selConsultores.size > 0 && !selConsultores.has(name)) return false;
        if (search.trim()) return name.toLowerCase().includes(search.toLowerCase());
        return true;
      })
      .map(({name, cells}) => ({
        name,
        cells: cells.map(entries =>
          entries.filter(e => {
            if (selClientes.size > 0 && e.client && !selClientes.has(e.client)) return false;
            if (search.trim() && selConsultores.size === 0) {
              // quando busca sem filtro de consultor, filtra também por cliente
              const q = search.toLowerCase();
              const matchCons = name.toLowerCase().includes(q);
              const matchCli  = (e.client||"").toLowerCase().includes(q);
              if (!matchCons && !matchCli) return false;
            }
            return true;
          })
        )
      }));
  }, [allConsultores, selConsultores, selClientes, search]);

  const fmtRange = () => {
    const start = days[0], end = days[6];
    const fmt = d => d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}).replace(".","");
    return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
  };

  const getColor = (entry) => {
    if (!entry) return "#6b7280";
    if (entry.type==="vacation") return "#0891b2";
    if (entry.type==="holiday") return "#d97706";
    if (entry.type==="blocked") return "#374151";
    if (entry.type==="reserved") return "#6366f1";
    const key = clientColorMap && Object.keys(clientColorMap).find(k => (entry.client||"").toUpperCase().includes(k));
    return key ? clientColorMap[key] : CLIENT_COLORS.default;
  };

  const toggleSet = (set, setFn, val) => setFn(prev => {
    const n = new Set(prev);
    n.has(val) ? n.delete(val) : n.add(val);
    return n;
  });

  const dropStyle = { position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:500,background:"#111118",border:"1px solid #2a2a3a",borderRadius:"12px",boxShadow:"0 8px 32px rgba(0,0,0,0.6)",minWidth:"200px",maxHeight:"260px",overflowY:"auto",padding:"6px" };
  const chipActive = { padding:"5px 12px",borderRadius:"99px",border:"1px solid #6c63ff",background:"#6c63ff22",color:"#a78bfa",fontSize:"12px",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" };
  const chipInactive = { padding:"5px 12px",borderRadius:"99px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",fontSize:"12px",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" };

  // Popup de detalhe (para visualização e edição)
  const [popup, setPopup] = React.useState(null); // { entry, name, x, y }
  const [popupPos, setPopupPos] = React.useState({x:0,y:0});
  const startDragPopup = React.useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX - popupPos.x, startY = e.clientY - popupPos.y;
    const onMove = (ev) => setPopupPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [popupPos]);

  const TIPO_LABEL = { client:"👤 Cliente", vacation:"🏖 Férias", holiday:"🎉 Feriado", reserved:"🔒 Reservado", blocked:"⛔ Bloqueado" };
  const NIVEL_MODAL = { especialista:{label:"Especialista",color:"#a78bfa"}, senior:{label:"Sênior",color:"#22d3a0"}, pleno:{label:"Pleno",color:"#f5a623"}, junior:{label:"Júnior",color:"#6e6e88"} };

  return (
    <div>
      {/* ── Barra de filtros ── */}
      <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"16px",flexWrap:"wrap" }}>
        {/* Busca */}
        <div style={{ position:"relative",display:"flex",alignItems:"center",flex:"1",minWidth:"180px",maxWidth:"260px" }}>
          <span style={{ position:"absolute",left:"10px",fontSize:"13px",color:"#3e3e55",pointerEvents:"none" }}>🔍</span>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar consultor ou cliente..."
            style={{ width:"100%",padding:"8px 12px 8px 32px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"12px",fontFamily:"inherit",outline:"none" }}
          />
          {search && <button onClick={()=>setSearch("")} style={{ position:"absolute",right:"8px",background:"none",border:"none",color:"#3e3e55",cursor:"pointer",fontSize:"14px",lineHeight:1 }}>✕</button>}
        </div>

        {/* Filtro consultores */}
        <div ref={consRef} style={{ position:"relative" }}>
          <button onClick={()=>{ setShowConsFilter(v=>!v); setShowCliFilter(false); }}
            style={selConsultores.size>0 ? chipActive : chipInactive}>
            👥 Consultores{selConsultores.size>0?` (${selConsultores.size})`:""}
            <span style={{ marginLeft:"5px",fontSize:"9px" }}>▾</span>
          </button>
          {showConsFilter && (
            <div style={dropStyle}>
              <div style={{ padding:"6px 8px 8px",borderBottom:"1px solid #1f1f2e",marginBottom:"4px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:"11px",color:"#6e6e88",fontWeight:700 }}>CONSULTORES</span>
                {selConsultores.size>0 && <button onClick={()=>setSelConsultores(new Set())} style={{ background:"none",border:"none",color:"#6c63ff",fontSize:"11px",cursor:"pointer",fontWeight:600 }}>Limpar</button>}
              </div>
              {allConsultores.map(({name},i)=>{
                const sel = selConsultores.has(name);
                return (
                  <div key={name} onClick={()=>toggleSet(selConsultores,setSelConsultores,name)}
                    style={{ display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",borderRadius:"8px",cursor:"pointer",background:sel?"#6c63ff15":"transparent" }}
                    onMouseEnter={e=>!sel&&(e.currentTarget.style.background="#18181f")}
                    onMouseLeave={e=>!sel&&(e.currentTarget.style.background="transparent")}>
                    <div style={{ width:"22px",height:"22px",borderRadius:"50%",background:`hsl(${i*37%360},55%,48%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:800,color:"#fff",flexShrink:0 }}>
                      {name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <span style={{ fontSize:"12px",color:sel?"#a78bfa":"#c8c8d8",fontWeight:sel?600:400,flex:1 }}>{name.split(" ")[0]}</span>
                    {sel && <span style={{ color:"#6c63ff",fontSize:"14px" }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filtro clientes */}
        <div ref={cliRef} style={{ position:"relative" }}>
          <button onClick={()=>{ setShowCliFilter(v=>!v); setShowConsFilter(false); }}
            style={selClientes.size>0 ? chipActive : chipInactive}>
            🏢 Clientes{selClientes.size>0?` (${selClientes.size})`:""}
            <span style={{ marginLeft:"5px",fontSize:"9px" }}>▾</span>
          </button>
          {showCliFilter && (
            <div style={dropStyle}>
              <div style={{ padding:"6px 8px 8px",borderBottom:"1px solid #1f1f2e",marginBottom:"4px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:"11px",color:"#6e6e88",fontWeight:700 }}>CLIENTES</span>
                {selClientes.size>0 && <button onClick={()=>setSelClientes(new Set())} style={{ background:"none",border:"none",color:"#6c63ff",fontSize:"11px",cursor:"pointer",fontWeight:600 }}>Limpar</button>}
              </div>
              {allClientes.length===0 && <div style={{ padding:"12px",fontSize:"12px",color:"#3e3e55",textAlign:"center" }}>Nenhum cliente nesta semana</div>}
              {allClientes.map(cli=>{
                const sel = selClientes.has(cli);
                const color = clientColorMap && Object.keys(clientColorMap).find(k=>cli.toUpperCase().includes(k));
                const dot = color ? clientColorMap[color] : "#6e6e88";
                return (
                  <div key={cli} onClick={()=>toggleSet(selClientes,setSelClientes,cli)}
                    style={{ display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",borderRadius:"8px",cursor:"pointer",background:sel?"#6c63ff15":"transparent" }}
                    onMouseEnter={e=>!sel&&(e.currentTarget.style.background="#18181f")}
                    onMouseLeave={e=>!sel&&(e.currentTarget.style.background="transparent")}>
                    <div style={{ width:"10px",height:"10px",borderRadius:"3px",background:dot,flexShrink:0 }}/>
                    <span style={{ fontSize:"12px",color:sel?"#a78bfa":"#c8c8d8",fontWeight:sel?600:400,flex:1 }}>{cli}</span>
                    {sel && <span style={{ color:"#6c63ff",fontSize:"14px" }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tags de filtros ativos */}
        {[...selConsultores].map(name=>(
          <span key={name} style={{ display:"inline-flex",alignItems:"center",gap:"5px",padding:"4px 10px",borderRadius:"99px",background:"#6c63ff22",border:"1px solid #6c63ff44",color:"#a78bfa",fontSize:"11px",fontWeight:600 }}>
            {name.split(" ")[0]}
            <button onClick={()=>toggleSet(selConsultores,setSelConsultores,name)} style={{ background:"none",border:"none",color:"#6c63ff",cursor:"pointer",fontSize:"12px",lineHeight:1,padding:0 }}>✕</button>
          </span>
        ))}
        {[...selClientes].map(cli=>(
          <span key={cli} style={{ display:"inline-flex",alignItems:"center",gap:"5px",padding:"4px 10px",borderRadius:"99px",background:"#22d3a015",border:"1px solid #22d3a040",color:"#22d3a0",fontSize:"11px",fontWeight:600 }}>
            {cli}
            <button onClick={()=>toggleSet(selClientes,setSelClientes,cli)} style={{ background:"none",border:"none",color:"#22d3a0",cursor:"pointer",fontSize:"12px",lineHeight:1,padding:0 }}>✕</button>
          </span>
        ))}

        {/* Spacer + navegação semana */}
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:"8px" }}>
          <button onClick={()=>setOffset(o=>o-1)} style={{ width:"32px",height:"32px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#18181f",color:"#6e6e88",cursor:"pointer",fontSize:"18px",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
          <div style={{ textAlign:"center",minWidth:"200px" }}>
            <div style={{ fontSize:"15px",fontWeight:700,color:"#f0f0fa" }}>{fmtRange()}</div>
            {offset!==0 && <div style={{ fontSize:"10px",color:"#3e3e55",marginTop:"1px" }}>{offset>0?`+${offset}`:`${offset}`} semana{Math.abs(offset)>1?"s":""} da atual</div>}
          </div>
          <button onClick={()=>setOffset(o=>o+1)} style={{ width:"32px",height:"32px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#18181f",color:"#6e6e88",cursor:"pointer",fontSize:"18px",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
          <button onClick={()=>setOffset(0)} style={{ padding:"6px 14px",borderRadius:"8px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",cursor:"pointer",fontSize:"11px",fontWeight:700,opacity:offset===0?0.35:1,whiteSpace:"nowrap" }} disabled={offset===0}>
            📍 Hoje
          </button>
        </div>
      </div>

      {/* ── Tabela ── */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%",borderCollapse:"collapse",tableLayout:"fixed",minWidth:"700px" }}>
          <colgroup>
            <col style={{ width:"130px" }}/>
            {days.map((_,i)=><col key={i}/>)}
          </colgroup>
          <thead>
            <tr>
              <th style={{ padding:"8px 12px",textAlign:"left",fontSize:"11px",color:"#6e6e88",fontWeight:700,background:"#0d0d14",borderBottom:"2px solid #2a2a3a",letterSpacing:"0.5px" }}>CONSULTOR</th>
              {days.map((d,i)=>{
                const isToday = d.getTime()===today.getTime();
                const isWknd = i>=5;
                return (
                  <th key={i} style={{ padding:"8px 6px",textAlign:"center",fontSize:"11px",fontWeight:700,background:isWknd?"#0a0a12":"#0d0d14",borderBottom:"2px solid "+(isToday?"#6c63ff":"#2a2a3a"),color:isToday?"#a78bfa":isWknd?"#2a2a3a":"#6e6e88",minWidth:"90px" }}>
                    <div style={{ letterSpacing:"0.5px" }}>{WD_SHORT[i]}</div>
                    <div style={{ fontSize:"18px",fontWeight:800,color:isToday?"#a78bfa":isWknd?"#2a2a3a":"#c8c8d8",marginTop:"2px" }}>{d.getDate()}</div>
                    <div style={{ fontSize:"10px",color:isWknd?"#1f1f2e":"#3e3e55",marginTop:"1px" }}>{d.toLocaleDateString("pt-BR",{month:"short"}).replace(".","")}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {consultores.length===0 && (
              <tr><td colSpan={8} style={{ textAlign:"center",padding:"48px",color:"#3e3e55",fontSize:"13px" }}>
                Nenhum consultor encontrado para os filtros selecionados
              </td></tr>
            )}
            {consultores.map(({name, cells},ri)=>{
              const origIdx = allConsultores.findIndex(c=>c.name===name);
              return (
                <tr key={name} style={{ borderBottom:"1px solid #18181f" }}>
                  <td style={{ padding:"8px 10px",verticalAlign:"middle",background:"#0d0d14",borderRight:"2px solid #18181f" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                      <div style={{ width:"28px",height:"28px",borderRadius:"9px",background:`hsl(${origIdx*37%360},55%,48%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:800,color:"#fff",flexShrink:0 }}>
                        {name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ fontSize:"12px",fontWeight:600,color:"#c8c8d8" }}>{name.split(" ")[0]}</span>
                    </div>
                  </td>
                  {cells.map((entries,ci)=>{
                    const d = days[ci];
                    const isToday = d.getTime()===today.getTime();
                    const isWknd = ci>=5;
                    const mName = MONTHS_ORDER[d.getMonth()];
                    const yr = d.getFullYear();
                    return (
                      <td key={ci}
                        onClick={()=>{ if(canEdit&&!isWknd&&onNewEntry&&entries.length===0) onNewEntry({consultor:name,month:mName,day:d.getDate(),year:yr}); }}
                        style={{ padding:"4px",verticalAlign:"top",background:isToday?"#16102a18":isWknd?"#0a0a12":"transparent",borderLeft:"1px solid #18181f",cursor:(canEdit&&!isWknd&&entries.length===0)?"pointer":"default",minHeight:"64px" }}>
                        {entries.length===0 && !isWknd && canEdit && (
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"56px",opacity:0.1,fontSize:"20px",color:"#6e6e88" }}>+</div>
                        )}
                        {entries.map((entry,ei)=>{
                          const color = getColor(entry);
                          return (
                            <div key={entry.id||ei}
                              onClick={e=>{
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.min(rect.right+8, window.innerWidth-300);
                                const y = Math.min(rect.top, window.innerHeight-340);
                                setPopupPos({x,y});
                                setPopup({entry,name});
                              }}
                              style={{ background:color,borderRadius:"7px",padding:"5px 7px",marginBottom:"3px",cursor:"pointer",transition:"opacity .15s" }}
                              onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                              onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                            >
                              <div style={{ fontSize:"10px",fontWeight:800,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                                {entry.modalidade==="remoto"?"💻 ":entry.modalidade==="presencial"?"🏢 ":""}{entry.client||entry.type}
                              </div>
                              {(entry.horaInicio||entry.horaFim) && (
                                <div style={{ fontSize:"9px",color:"rgba(255,255,255,0.75)",marginTop:"2px" }}>{entry.horaInicio||""}{entry.horaFim?"→"+entry.horaFim:""}</div>
                              )}
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize:"11px",color:"#3e3e55",marginTop:"10px" }}>💡 Clique em agenda para ver detalhes{canEdit?" · Clique em célula vazia para adicionar":""} · Colunas escuras = fim de semana</p>

      {/* Popup de detalhe da entrada */}
      {popup && (
        <div onClick={e=>e.stopPropagation()}
          style={{ position:"fixed",left:popupPos.x+"px",top:popupPos.y+"px",background:"#111118",border:"1px solid #2a2a3a",borderRadius:"14px",zIndex:9000,width:"280px",boxShadow:"0 8px 40px rgba(0,0,0,0.7)",display:"flex",flexDirection:"column",maxHeight:"80vh" }}>
          {/* Header arrastável */}
          <div onMouseDown={startDragPopup}
            style={{ padding:"13px 16px 11px",borderBottom:"1px solid #1f1f2e",flexShrink:0,cursor:"grab",userSelect:"none" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>{popup.name.split(" ")[0]}</div>
                <div style={{ fontSize:"11px",color:"#3e3e55",marginTop:"2px" }}>
                  {popup.entry.day && `Dia ${popup.entry.day}`}{popup.entry.month ? ` · ${popup.entry.month}` : ""}{popup.entry.year ? ` ${popup.entry.year}` : ""}
                </div>
              </div>
              <button onMouseDown={e=>e.stopPropagation()} onClick={()=>setPopup(null)}
                style={{ background:"#1f1f2e",border:"1px solid #2a2a3a",color:"#6e6e88",borderRadius:"8px",width:"28px",height:"28px",cursor:"pointer",fontSize:"13px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✕</button>
            </div>
          </div>

          {/* Corpo do detalhe */}
          <div style={{ padding:"14px 16px",overflowY:"auto" }}>
            {/* Cor + cliente */}
            <div style={{ background:getColor(popup.entry),borderRadius:"10px",padding:"10px 14px",marginBottom:"12px" }}>
              <div style={{ fontSize:"13px",fontWeight:800,color:"#fff" }}>
                {popup.entry.modalidade==="remoto"?"💻 ":popup.entry.modalidade==="presencial"?"🏢 ":""}{popup.entry.client||TIPO_LABEL[popup.entry.type]||popup.entry.type}
              </div>
              {popup.entry.modalidade && (
                <div style={{ fontSize:"10px",color:"rgba(255,255,255,0.7)",marginTop:"3px" }}>
                  {popup.entry.modalidade==="remoto"?"Remoto":"Presencial"}
                </div>
              )}
            </div>

            {/* Tipo */}
            <div style={{ fontSize:"11px",color:"#6e6e88",marginBottom:"10px" }}>
              {TIPO_LABEL[popup.entry.type]||popup.entry.type}
            </div>

            {/* Horários */}
            {(popup.entry.horaInicio||popup.entry.horaFim) && (
              <div style={{ background:"#18181f",borderRadius:"8px",padding:"9px 12px",marginBottom:"10px",display:"flex",gap:"14px",flexWrap:"wrap",fontSize:"12px" }}>
                {popup.entry.horaInicio && <span>🕐 <strong style={{ color:"#f0f0fa" }}>{popup.entry.horaInicio}</strong></span>}
                {popup.entry.horaFim    && <span>🕔 <strong style={{ color:"#f0f0fa" }}>{popup.entry.horaFim}</strong></span>}
                {popup.entry.intervalo  && <span>☕ <strong style={{ color:"#f0f0fa" }}>{popup.entry.intervalo}min</strong></span>}
              </div>
            )}

            {/* Atividades */}
            {popup.entry.atividades && (
              <div style={{ background:"#18181f",borderRadius:"8px",padding:"9px 12px",marginBottom:"10px" }}>
                <div style={{ fontSize:"10px",color:"#3e3e55",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:"5px" }}>Atividades</div>
                <div style={{ fontSize:"12px",color:"#c8c8d8",lineHeight:1.6,whiteSpace:"pre-wrap" }}>{popup.entry.atividades}</div>
              </div>
            )}

            {/* Histórico */}
            {popup.entry.criadoPor && (
              <div style={{ fontSize:"10px",color:"#3e3e55",marginBottom:"4px" }}>
                ✏️ Criado por <strong style={{ color:"#6e6e88" }}>{popup.entry.criadoPor}</strong>
                {popup.entry.criadoEm && <span> em {new Date(popup.entry.criadoEm).toLocaleDateString("pt-BR")}</span>}
              </div>
            )}
            {popup.entry.alteradoPor && (
              <div style={{ fontSize:"10px",color:"#3e3e55" }}>
                🔄 Alterado por <strong style={{ color:"#6e6e88" }}>{popup.entry.alteradoPor}</strong>
                {popup.entry.alteradoEm && <span> em {new Date(popup.entry.alteradoEm).toLocaleDateString("pt-BR")}</span>}
              </div>
            )}

            {/* Botão editar (só para quem pode) */}
            {canEdit && onEdit && (
              <button onMouseDown={e=>e.stopPropagation()}
                onClick={()=>{ onEdit(popup.entry, popup.name); setPopup(null); }}
                style={{ width:"100%",padding:"9px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"inherit",marginTop:"12px",boxShadow:"0 4px 14px #6c63ff44" }}>
                ✏️ Editar agenda
              </button>
            )}
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
  const [popupPos, setPopupPos] = React.useState({x:0,y:0});
  const dragRef = React.useRef(null);
  const startDrag = React.useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX - popupPos.x, startY = e.clientY - popupPos.y;
    const onMove = (ev) => setPopupPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [popupPos]);
  const openPopup = React.useCallback((entries, x, y) => {
    setPopupPos({ x: Math.min(x+8, window.innerWidth-300), y: Math.min(y+8, window.innerHeight-340) });
    setPopup(entries);
  }, []);
  const [selectedConsultores, setSelectedConsultores] = React.useState(new Set(consultores));
  const [showFilter, setShowFilter] = React.useState(false);
  const [showClientFilter, setShowClientFilter] = React.useState(false);
  const [selectedClients, setSelectedClients] = React.useState(new Set());

  const monthsAvail = allMonths.filter(m => m !== "Todos");
  const days = Array.from({length:31},(_,i)=>i+1);

  const lookup = {};
  for (const [name, entries] of Object.entries(data)) {
    lookup[name] = {};
    entries.filter(e => {
      const monthMatch = e.month.toUpperCase() === calMes.toUpperCase();
      const yearMatch  = !e.year || e.year === calAno;
      return monthMatch && yearMatch;
    }).forEach(e=>{ if (!lookup[name][e.day]) lookup[name][e.day]=[]; lookup[name][e.day].push(e); });
  }

  // All unique clients present in this month
  const allClientsInMonth = React.useMemo(() => {
    const set = new Set();
    consultores.forEach(name => {
      (data[name]||[]).filter(e =>
        e.month.toUpperCase()===calMes.toUpperCase() &&
        (!e.year || e.year===calAno) &&
        e.type==="client"
      ).forEach(e => set.add(normalizeClient(e.client)));
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

  const allConsultoresWithData = consultores.filter(name=>
    (data[name]||[]).some(e =>
      e.month.toUpperCase()===calMes.toUpperCase() && (!e.year || e.year===calAno)
    )
  );
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
    if (entry.type==="reserved") return "#6e6e88";
    if (entry.type==="blocked") return "#6e6e88";
    const cname = normalizeClient(entry.client);
    return clientColors[cname] || getClientColor(entry.client);
  };

  const closeAll = () => { setPopup(null); setShowFilter(false); setShowClientFilter(false); };

  return (
    <div onClick={closeAll}>
      {/* MONTH SELECTOR */}
      <div style={{ display:"flex",alignItems:"center",gap:"16px",marginBottom:"16px",flexWrap:"wrap" }}>
        <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:700,color:"#f0f0fa",margin:0 }}>📆 Calendário Mensal</h2>
        <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
          {monthsAvail.map(m=>(
            <button key={m} onClick={()=>setCalMes(m)} style={{ padding:"5px 12px",borderRadius:"16px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,background:calMes===m?"#3b82f6":"#18181f",color:calMes===m?"#fff":"#6e6e88" }}>{m.slice(0,3)}</button>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"4px" }}>
          <button onClick={()=>setCalAno(a=>a-1)} style={{ padding:"4px 8px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#18181f",color:"#6e6e88",cursor:"pointer",fontSize:"13px",fontWeight:700,lineHeight:1 }}>‹</button>
          <span style={{ padding:"4px 14px",borderRadius:"8px",background:"#18181f",border:"1px solid #2a2a3a",fontSize:"13px",fontWeight:700,color:"#f0f0fa",minWidth:"62px",textAlign:"center" }}>{calAno}</span>
          <button onClick={()=>setCalAno(a=>a+1)} style={{ padding:"4px 8px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"#18181f",color:"#6e6e88",cursor:"pointer",fontSize:"13px",fontWeight:700,lineHeight:1 }}>›</button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ display:"flex",gap:"12px",marginBottom:"16px",flexWrap:"wrap",alignItems:"flex-start" }} onClick={e=>e.stopPropagation()}>

        {/* ── CONSULTOR FILTER ── */}
        <div style={{ position:"relative" }}>
          <button onClick={()=>{ setShowFilter(!showFilter); setShowClientFilter(false); }} style={{ padding:"7px 16px",borderRadius:"8px",border:"1px solid "+(showFilter?"#3b82f6":"#2a2a3a"),background:showFilter?"#16102a":"#18181f",color:showFilter?"#60a5fa":"#6e6e88",fontSize:"13px",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:"8px",whiteSpace:"nowrap" }}>
            👥 Consultores
            <span style={{ background:selectedConsultores.size<consultores.length?"#f59e0b":"#3b82f6",color:"#fff",borderRadius:"12px",padding:"1px 8px",fontSize:"11px",fontWeight:700 }}>{selectedConsultores.size}/{consultores.length}</span>
            <span style={{ fontSize:"10px" }}>{showFilter?"▲":"▼"}</span>
          </button>
          {showFilter && (
            <div style={{ position:"absolute",top:"calc(100% + 8px)",left:0,background:"#18181f",border:"1px solid #2a2a3a",borderRadius:"12px",padding:"16px",zIndex:500,minWidth:"300px",maxWidth:"440px",boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
                <span style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>Filtrar consultores</span>
                <div style={{ display:"flex",gap:"6px" }}>
                  <button onClick={selectAllConsultores} style={{ padding:"4px 10px",borderRadius:"6px",border:"none",background:"#6c63ff22",color:"#60a5fa",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>Todos</button>
                  <button onClick={clearAllConsultores} style={{ padding:"4px 10px",borderRadius:"6px",border:"none",background:"#2a2a3a22",color:"#6e6e88",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>Limpar</button>
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px" }}>
                {consultores.map((name,i)=>{
                  const isSelected = selectedConsultores.has(name);
                  const hasData = allConsultoresWithData.includes(name);
                  return (
                    <button key={name} onClick={()=>toggleConsultor(name)} style={{ display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",borderRadius:"8px",border:"1px solid "+(isSelected?"#6c63ff":"#2a2a3a"),background:isSelected?"#16102a":"#0d0d14",cursor:"pointer",textAlign:"left",opacity:hasData?1:0.45 }}>
                      <div style={{ width:"26px",height:"26px",borderRadius:"50%",background:"hsl("+(i*29%360)+",65%,"+(isSelected?"55%":"30%")+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:700,color:"#fff",flexShrink:0 }}>{getInitials(name)}</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:"12px",fontWeight:600,color:isSelected?"#f0f0fa":"#6e6e88",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name.trim().split(" ")[0]}</div>
                        {!hasData && <div style={{ fontSize:"10px",color:"#6e6e88" }}>sem dados</div>}
                      </div>
                      {isSelected && <span style={{ color:"#6c63ff",fontSize:"14px",flexShrink:0 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── CLIENT FILTER ── */}
        <div style={{ position:"relative" }}>
          <button onClick={()=>{ setShowClientFilter(!showClientFilter); setShowFilter(false); }} style={{ padding:"7px 16px",borderRadius:"8px",border:"1px solid "+(showClientFilter?"#f59e0b":clientFilterActive?"#f59e0b44":"#2a2a3a"),background:showClientFilter?"#1f1a0e":clientFilterActive?"#1f1a0e":"#18181f",color:showClientFilter||clientFilterActive?"#f59e0b":"#6e6e88",fontSize:"13px",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:"8px",whiteSpace:"nowrap" }}>
            🏢 Clientes
            <span style={{ background:clientFilterActive?"#f59e0b":"#2a2a3a",color:clientFilterActive?"#000":"#6e6e88",borderRadius:"12px",padding:"1px 8px",fontSize:"11px",fontWeight:700 }}>{selectedClients.size}/{allClientsInMonth.length}</span>
            <span style={{ fontSize:"10px" }}>{showClientFilter?"▲":"▼"}</span>
          </button>
          {showClientFilter && (
            <div style={{ position:"absolute",top:"calc(100% + 8px)",left:0,background:"#18181f",border:"1px solid #2a2a3a",borderRadius:"12px",padding:"16px",zIndex:500,minWidth:"280px",maxWidth:"400px",boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
                <span style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>Filtrar por cliente</span>
                <div style={{ display:"flex",gap:"6px" }}>
                  <button onClick={selectAllClients} style={{ padding:"4px 10px",borderRadius:"6px",border:"none",background:"#f59e0b22",color:"#f59e0b",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>Todos</button>
                  <button onClick={clearAllClients} style={{ padding:"4px 10px",borderRadius:"6px",border:"none",background:"#2a2a3a22",color:"#6e6e88",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>Limpar</button>
                </div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:"5px",maxHeight:"280px",overflowY:"auto" }}>
                {allClientsInMonth.length === 0 && <p style={{ color:"#6e6e88",fontSize:"12px",textAlign:"center",padding:"12px 0" }}>Nenhum cliente neste mês</p>}
                {allClientsInMonth.map(clientName=>{
                  const isSelected = selectedClients.has(clientName);
                  const color = getClientColor(clientName);
                  return (
                    <button key={clientName} onClick={()=>toggleClient(clientName)} style={{ display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",borderRadius:"8px",border:"1px solid "+(isSelected?color+"66":"#2a2a3a"),background:isSelected?color+"18":"#0d0d14",cursor:"pointer",textAlign:"left" }}>
                      <div style={{ width:"10px",height:"10px",borderRadius:"3px",background:isSelected?color:"#6e6e88",flexShrink:0,transition:"background 0.2s" }}/>
                      <span style={{ fontSize:"13px",fontWeight:600,color:isSelected?color:"#6e6e88",flex:1 }}>{clientName}</span>
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
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"24px",height:"10px",borderRadius:"3px",background:"#1a2744" }}/><span style={{ fontSize:"11px",color:"#6e6e88" }}>Fim de semana</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"10px",height:"10px",borderRadius:"3px",background:"#ef4444" }}/><span style={{ fontSize:"11px",color:"#6e6e88" }}>Feriado</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"10px",height:"10px",borderRadius:"3px",background:"#22d3a0" }}/><span style={{ fontSize:"11px",color:"#6e6e88" }}>Férias</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"10px",height:"10px",borderRadius:"3px",background:"#6e6e88" }}/><span style={{ fontSize:"11px",color:"#6e6e88" }}>Reservado</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}><div style={{ width:"10px",height:"10px",borderRadius:"3px",background:"#6e6e88" }}/><span style={{ fontSize:"11px",color:"#6e6e88" }}>Bloqueado</span></div>
      </div>

      {/* TABLE */}
      <div style={{ overflowX:"auto",borderRadius:"12px",border:"1px solid #2a2a3a" }}>
        <table style={{ borderCollapse:"collapse",width:"100%",minWidth:(daysInMonth*34+160)+"px" }}>
          <thead>
            {/* Weekday row */}
            <tr style={{ background:"#18181f" }}>
              <th style={{ padding:"8px 16px",textAlign:"left",fontSize:"11px",fontWeight:700,color:"#6e6e88",position:"sticky",left:0,background:"#18181f",zIndex:2,minWidth:"150px",borderBottom:"1px solid #0d0d14" }}>Consultor</th>
              {allDays.map(d=>{
                const dow = getDayOfWeek(d);
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <th key={d} style={{ padding:"3px 2px",textAlign:"center",fontSize:"9px",fontWeight:600,color:isWeekend?"#6e6e88":"#6e6e88",minWidth:"34px",maxWidth:"34px",background:isWeekend?"#0d1a30":"#18181f",borderBottom:"1px solid #0d0d14",borderLeft:"1px solid #0d0d14" }}>
                    {WEEKDAY_LABELS[dow]}
                  </th>
                );
              })}
            </tr>
            {/* Day number row */}
            <tr style={{ background:"#18181f" }}>
              <th style={{ padding:"4px 16px",position:"sticky",left:0,background:"#18181f",zIndex:2,borderBottom:"1px solid #2a2a3a" }}></th>
              {allDays.map(d=>{
                const dow = getDayOfWeek(d);
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <th key={d} style={{ padding:"4px 2px",textAlign:"center",fontSize:"11px",fontWeight:700,color:isWeekend?"#374151":"#6e6e88",minWidth:"34px",background:isWeekend?"#0d1a30":"#18181f",borderBottom:"1px solid #2a2a3a",borderLeft:"1px solid #0d0d14" }}>{d}</th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeConsultores.map((name)=>(
              <tr key={name} style={{ borderTop:"1px solid #18181f" }}>
                <td style={{ padding:"6px 16px",fontSize:"12px",fontWeight:600,color:"#2a2a3a",position:"sticky",left:0,background:"#0d0d14",zIndex:1,whiteSpace:"nowrap",borderRight:"1px solid #2a2a3a" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                    <div style={{ width:"22px",height:"22px",borderRadius:"50%",background:"hsl("+(consultores.indexOf(name)*29%360)+",65%,50%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:700,color:"#fff",flexShrink:0 }}>{getInitials(name)}</div>
                    {name.trim().split(" ").slice(0,2).join(" ")}
                  </div>
                </td>
                {allDays.map(d=>{
                  const dow = getDayOfWeek(d);
                  const isWeekend = dow === 0 || dow === 6;
                  const entry = lookup[name]?.[d];
                  const colBg = isWeekend ? "#0d1a30" : "#0d0d14";

                  const dayEntries = lookup[name]?.[d] || [];
                  if (dayEntries.length === 0) return (
                    <td key={d} style={{ padding:"3px",borderLeft:"1px solid #18181f",background:colBg }}
                      onClick={e=>{ if(readonly) return; e.stopPropagation(); onNewEntry({ consultor:name, month:calMes, day:d }); }}>
                      <div style={{ width:"28px",height:"28px",borderRadius:"4px",background:"transparent",border:"1px dashed transparent",margin:"0 auto",cursor:readonly?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s" }}
                        onMouseEnter={e=>{ if(readonly) return; e.currentTarget.style.background="#22d3a018"; e.currentTarget.style.borderColor="#22c55e55"; e.currentTarget.querySelector("span").style.opacity="1"; }}
                        onMouseLeave={e=>{ if(readonly) return; e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="transparent"; e.currentTarget.querySelector("span").style.opacity="0"; }}>
                        <span style={{ fontSize:"13px",opacity:0,transition:"opacity 0.15s",userSelect:"none",color:"#22d3a0" }}>＋</span>
                      </div>
                    </td>
                  );
                  const allFiltered = dayEntries.every(e=>e.type==="client"&&clientFilterActive&&!selectedClients.has(normalizeClient(e.client)));
                  return (
                    <td key={d} style={{ padding:"2px",borderLeft:"1px solid #18181f",background:colBg,verticalAlign:"top" }} onClick={e=>{e.stopPropagation();if(!allFiltered)openPopup({name,day:d,entries:dayEntries},e.clientX,e.clientY);}}>
                      <div style={{ width:"28px",minHeight:"28px",borderRadius:"4px",overflow:"hidden",margin:"0 auto",cursor:allFiltered?"default":"pointer",display:"flex",flexDirection:"column",gap:"1px" }}>
                        {dayEntries.slice(0,3).map((entry,ei)=>{
                          const color=getColor(entry);
                          const label=entry.type==="vacation"?"FÉR":entry.type==="holiday"?"FER":entry.type==="blocked"?"BLQ":entry.type==="reserved"?"RES":normalizeClient(entry.client).slice(0,3);
                          const filtered=entry.type==="client"&&clientFilterActive&&!selectedClients.has(normalizeClient(entry.client));
                          return (
                            <div key={entry.id||ei} style={{ flex:1,background:filtered?"#18181f":color,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"8px",opacity:filtered?0.2:1 }}>
                              {!filtered&&dayEntries.length<=2&&<span style={{ fontSize:"6px",fontWeight:800,color:"#fff",letterSpacing:"-0.5px" }}>{label}</span>}
                            </div>
                          );
                        })}
                        {dayEntries.length>3&&<div style={{ background:"#0d0d14",display:"flex",alignItems:"center",justifyContent:"center",minHeight:"7px" }}><span style={{ fontSize:"6px",color:"#6e6e88",fontWeight:700 }}>+{dayEntries.length-3}</span></div>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize:"11px",color:"#6e6e88",marginTop:"8px" }}>💡 Clique em célula colorida para editar/excluir · Clique em célula vazia para adicionar agenda · Colunas escuras = fim de semana</p>
      {popup && (
        <div onClick={e=>e.stopPropagation()} style={{ position:"fixed",left:popupPos.x+"px",top:popupPos.y+"px",background:"#18181f",border:"1px solid #6e6e88",borderRadius:"12px",zIndex:9000,width:"280px",boxShadow:"0 8px 32px rgba(0,0,0,0.6)",maxHeight:"80vh",display:"flex",flexDirection:"column" }}>
          {/* Header fixo + drag */}
          <div onMouseDown={startDrag} style={{ padding:"14px 16px 10px",borderBottom:"1px solid #2a2a3a",flexShrink:0,cursor:"grab",userSelect:"none" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>{popup.name.trim().split(" ")[0]}</div>
                <div style={{ fontSize:"11px",color:"#6e6e88" }}>Dia {popup.day} · {calMes} {calAno} ({WEEKDAY_LABELS[getDayOfWeek(popup.day)]})</div>
              </div>
              <div style={{ display:"flex",gap:"6px",alignItems:"center" }}>
                {!readonly && <button onMouseDown={e=>e.stopPropagation()} onClick={()=>{ onNewEntry({consultor:popup.name,month:calMes,day:popup.day}); setPopup(null); }} style={{ padding:"4px 8px",borderRadius:"6px",border:"1px solid #22c55e44",background:"#22d3a018",color:"#22d3a0",fontSize:"11px",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>＋ Novo</button>}
                <button onMouseDown={e=>e.stopPropagation()} onClick={()=>setPopup(null)} style={{ background:"#2a2a3a",border:"none",color:"#6e6e88",borderRadius:"8px",width:"28px",height:"28px",cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✕</button>
              </div>
            </div>
          </div>
          {/* Entry list com scroll */}
          <div style={{ display:"flex",flexDirection:"column",gap:"8px",overflowY:"auto",padding:"12px 16px 16px",maxHeight:"calc(80vh - 70px)" }}>
            {(popup.entries||[]).map((entry,ei)=>{
              const color = getColor(entry);
              const TYPE_LABEL = {client:"👤 Cliente",vacation:"🏖 Férias",holiday:"🎉 Feriado",reserved:"🔒 Reservado",blocked:"⛔ Bloqueado"};
              return (
                <div key={entry.id||ei} style={{ background:"#0d0d14",borderRadius:"8px",border:"1px solid #2a2a3a",overflow:"hidden" }}>
                  {/* Entry header bar */}
                  <div style={{ background:color,padding:"4px 10px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <span style={{ fontSize:"11px",fontWeight:800,color:"#fff",letterSpacing:"0.3px" }}>{entry.client||TYPE_LABEL[entry.type]||entry.type}</span>
                    <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
                      {entry.modalidade && <span title={entry.modalidade==="presencial"?"Presencial":"Remoto"} style={{ fontSize:"11px" }}>{entry.modalidade==="remoto"?"💻":"🏢"}</span>}
                      {(entry.horaInicio||entry.horaFim) && <span style={{ fontSize:"10px",color:"rgba(255,255,255,0.85)",fontWeight:600 }}>{entry.horaInicio||""}{entry.horaFim?" → "+entry.horaFim:""}{entry.intervalo?" ☕"+entry.intervalo+"m":""}</span>}
                    </div>
                  </div>
                  {entry.atividades && (
                    <div style={{ padding:"6px 10px 0",fontSize:"11px",color:"#6e6e88",lineHeight:"1.5",whiteSpace:"pre-wrap",borderBottom:"1px solid #18181f" }}>{entry.atividades}</div>
                  )}
                  {/* History */}
                  <div style={{ padding:"8px 10px" }}>
                    {(entry.historico||[]).length>0 ? (
                      <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
                        {entry.historico.map((h,hi)=>(
                          <div key={hi} style={{ fontSize:"10px",color:"#6e6e88" }}>
                            <span style={{ color:h.acao==="criado"?"#22c55e":h.acao==="alterado"?"#f59e0b":"#ef4444",marginRight:"4px" }}>{h.acao==="criado"?"＋":h.acao==="alterado"?"✎":"✕"}</span>
                            <span style={{ color:"#6e6e88",fontWeight:600 }}>{h.por}</span>
                            <span style={{ color:"#6e6e88" }}> · {formatDateTime(h.em)}</span>
                            {h.alteracoes&&h.alteracoes.length>0&&(
                              <div style={{ marginTop:"2px",paddingLeft:"14px" }}>
                                {h.alteracoes.map((a,ai)=>(
                                  <div key={ai} style={{ fontSize:"9px",color:"#6e6e88" }}>
                                    <span style={{ color:"#6e6e88" }}>{a.campo}:</span> <span style={{ textDecoration:"line-through",color:"#ef444488" }}>{a.de}</span> → <span style={{ color:"#22d3a0" }}>{a.para}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize:"10px",color:"#6e6e88",fontStyle:"italic" }}>Sem histórico</span>
                    )}
                    {/* Actions */}
                    {!readonly && (
                      <div style={{ display:"flex",gap:"6px",marginTop:"8px" }}>
                        <button onClick={()=>{ onEdit({...entry,consultor:popup.name,month:calMes}); setPopup(null); }} style={{ flex:1,padding:"5px",borderRadius:"5px",border:"none",background:"#6c63ff",color:"#fff",fontSize:"11px",fontWeight:700,cursor:"pointer" }}>✏️ Editar</button>
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
  const hue = (idx * 47) % 360;
  const avatarGrad = `linear-gradient(135deg,hsl(${hue},65%,55%),hsl(${(hue+40)%360},70%,45%))`;
  return (
    <div onClick={onClick} className="card-hover" style={{ background:selected?"#16102a":"#111118",border:"1px solid "+(selected?"#6c63ff66":"#1f1f2e"),borderRadius:"16px",padding:"20px 22px",cursor:"pointer",position:"relative",overflow:"hidden" }}>
      {selected && <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,#6c63ff08,#a78bfa05)",pointerEvents:"none" }}/>}
      {/* Accent line top */}
      {selected && <div style={{ position:"absolute",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,#6c63ff,#a78bfa)" }}/>}
      <div style={{ display:"flex",alignItems:"center",gap:"13px",marginBottom:"16px" }}>
        <div style={{ width:"44px",height:"44px",borderRadius:"14px",background:avatarGrad,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"14px",color:"#fff",flexShrink:0,boxShadow:`0 4px 12px hsl(${hue},60%,50%)44` }}>{getInitials(name)}</div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontWeight:700,fontSize:"15px",color:"#f0f0fa",letterSpacing:"-0.2px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{name.trim()}</div>
          <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"3px",display:"flex",gap:"10px" }}>
            <span style={{ display:"flex",alignItems:"center",gap:"4px" }}><span style={{ color:"#22d3a0",fontWeight:700 }}>{total}</span> dias cliente</span>
            {vacation>0 && <span style={{ display:"flex",alignItems:"center",gap:"4px" }}><span style={{ color:"#a78bfa",fontWeight:700 }}>{vacation}</span> férias</span>}
          </div>
        </div>
        {selected && <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:"#6c63ff",boxShadow:"0 0 8px #6c63ff" }}/>}
      </div>
      {topClients.length>0 && (
        <div style={{ display:"flex",flexDirection:"column",gap:"7px" }}>
          {topClients.map(([client,count])=>{
            const pct = Math.round((count/total)*100);
            const color = getClientColor(client);
            return (
              <div key={client}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px",alignItems:"center" }}>
                  <span style={{ fontSize:"11px",color:"#8888a8",fontWeight:500,letterSpacing:"0.2px" }}>{client}</span>
                  <span style={{ fontSize:"10px",color:"#4e4e66",fontWeight:600 }}>{pct}%</span>
                </div>
                <div style={{ height:"4px",background:"#1f1f2e",borderRadius:"99px",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:pct+"%",background:`linear-gradient(90deg,${color},${color}bb)`,borderRadius:"99px",transition:"width .4s" }}/>
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
  const [weekIdx, setWeekIdx] = React.useState(0);
  const [popup, setPopup] = React.useState(null); // { day, entries, x, y }
  const [popupPos, setPopupPos] = React.useState({x:0,y:0});
  const startDrag = React.useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX - popupPos.x, startY = e.clientY - popupPos.y;
    const onMove = (ev) => setPopupPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [popupPos]);
  const openPopupCV = React.useCallback((data, x, y) => {
    setPopupPos({ x: Math.min(x+8, window.innerWidth-300), y: Math.min(y+8, window.innerHeight-340) });
    setPopup(data);
  }, []);
  const wd = ["Seg","Ter","Qua","Qui","Sex","Sab","Dom"];
  const WD_FULL = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
  const TYPE_LABEL = {client:"👤 Cliente",vacation:"🏖 Férias",holiday:"🎉 Feriado",reserved:"🔒 Reservado",blocked:"⛔ Bloqueado"};

  // Infer year from entries or use current year
  const entryValues = Object.values(byDay||{}).flat();
  const year = (entryValues[0]?.year) || new Date().getFullYear();

  // Build month grid aligned to correct weekday
  const monthIdx = MONTHS_ORDER.indexOf(month);
  const firstDayRaw = monthIdx >= 0 ? new Date(year, monthIdx, 1).getDay() : 1;
  const offset = (firstDayRaw + 6) % 7; // Mon=0 … Sun=6
  const daysInMonth = monthIdx >= 0 ? new Date(year, monthIdx + 1, 0).getDate() : 31;

  const slots = [];
  for (let i = 0; i < offset; i++) slots.push(null);
  for (let d = 1; d <= daysInMonth; d++) slots.push(d);
  while (slots.length % 7 !== 0) slots.push(null);

  const weeks = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));
  const totalWeeks = weeks.length;
  const wi = Math.min(weekIdx, totalWeeks - 1);
  const currentWeek = weeks[wi] || [];

  const firstDay = currentWeek.find(d => d !== null);
  const lastDay = [...currentWeek].reverse().find(d => d !== null);
  const weekLabel = firstDay && lastDay ? firstDay === lastDay ? `Dia ${firstDay}` : `${firstDay} – ${lastDay} de ${month}` : month;

  const getColor = e => e.type==="vacation"?"#22c55e":e.type==="holiday"?"#ef4444":e.type==="reserved"?"#6e6e88":e.type==="blocked"?"#6e6e88":getClientColor(e.client);

  return (
    <div onClick={()=>setPopup(null)}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",gap:"16px",marginBottom:"20px",flexWrap:"wrap" }}>
        <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:700,color:"#f0f0fa",margin:0 }}>📅 {consultant} — {month} {year}</h2>
        <div style={{ display:"flex",alignItems:"center",gap:"6px",background:"#18181f",borderRadius:"10px",padding:"4px 6px",border:"1px solid #2a2a3a" }}>
          <button onClick={()=>setWeekIdx(w=>Math.max(0,w-1))} disabled={wi===0}
            style={{ background:"none",border:"none",color:wi===0?"#2a2a3a":"#6e6e88",cursor:wi===0?"default":"pointer",fontWeight:700,fontSize:"16px",padding:"2px 8px",lineHeight:1 }}>‹</button>
          <span style={{ fontSize:"12px",fontWeight:600,color:"#6e6e88",minWidth:"120px",textAlign:"center" }}>{weekLabel}</span>
          <button onClick={()=>setWeekIdx(w=>Math.min(totalWeeks-1,w+1))} disabled={wi===totalWeeks-1}
            style={{ background:"none",border:"none",color:wi===totalWeeks-1?"#2a2a3a":"#6e6e88",cursor:wi===totalWeeks-1?"default":"pointer",fontWeight:700,fontSize:"16px",padding:"2px 8px",lineHeight:1 }}>›</button>
        </div>
        <span style={{ fontSize:"12px",color:"#6e6e88" }}>Semana {wi+1} de {totalWeeks}</span>
      </div>

      {/* Week grid */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"10px" }}>
        {wd.map((d,i)=>(
          <div key={d} style={{ textAlign:"center",fontSize:"11px",fontWeight:700,color:"#6e6e88",padding:"8px 0",borderBottom:"1px solid #18181f" }}>
            <div>{d}</div>
            <div style={{ fontSize:"10px",fontWeight:400,color:"#2a2a3a",marginTop:"2px" }}>{WD_FULL[i]}</div>
          </div>
        ))}
        {currentWeek.map((day,i)=>{
          if (!day) return <div key={"e"+i} style={{ minHeight:"140px",borderRadius:"10px",background:"#0d0d1444" }}/>;
          const entries = Array.isArray(byDay[day]) ? byDay[day] : (byDay[day] ? [byDay[day]] : []);
          const isToday = (() => { const t=new Date(); return t.getDate()===day && t.getMonth()===monthIdx && t.getFullYear()===year; })();
          return (
            <div key={day} onClick={e=>e.stopPropagation()} style={{ minHeight:"140px",borderRadius:"10px",background:isToday?"#16102a":"#18181f",border:"1px solid "+(isToday?"#3b82f6":"#2a2a3a"),padding:"10px",display:"flex",flexDirection:"column",gap:"6px" }}>
              <div style={{ fontSize:"18px",fontWeight:700,color:isToday?"#60a5fa":"#f0f0fa",marginBottom:"4px" }}>{day}</div>
              {entries.length===0 && <div style={{ fontSize:"11px",color:"#2a2a3a",fontStyle:"italic" }}>—</div>}
              {entries.map((entry,ei)=>{
                const color = getColor(entry);
                return (
                  <div key={ei} onClick={e=>{ e.stopPropagation(); openPopupCV({day,entries},e.clientX,e.clientY); }}
                    style={{ background:color+"22",border:"1px solid "+color+"55",borderRadius:"6px",padding:"6px 8px",cursor:"pointer",transition:"filter .1s" }}
                    onMouseEnter={e=>e.currentTarget.style.filter="brightness(1.2)"}
                    onMouseLeave={e=>e.currentTarget.style.filter=""}>
                    <div style={{ fontSize:"11px",fontWeight:700,color:color,lineHeight:1.3 }}>{entry.client||TYPE_LABEL[entry.type]||entry.type}</div>
                    {(entry.horaInicio||entry.horaFim) && (
                      <div style={{ fontSize:"10px",color:"#6e6e88",marginTop:"2px" }}>{entry.horaInicio||""}{entry.horaFim?" – "+entry.horaFim:""}</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* POPUP — detail view on entry click */}
      {popup && (
        <div onClick={e=>e.stopPropagation()}
          style={{ position:"fixed",left:popupPos.x+"px",top:popupPos.y+"px",background:"#18181f",border:"1px solid #6e6e88",borderRadius:"12px",zIndex:9000,width:"290px",boxShadow:"0 8px 32px rgba(0,0,0,0.6)",maxHeight:"80vh",display:"flex",flexDirection:"column" }}>
          {/* Header fixo + drag */}
          <div onMouseDown={startDrag} style={{ padding:"14px 16px 12px",borderBottom:"1px solid #2a2a3a",flexShrink:0,cursor:"grab",userSelect:"none" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontSize:"13px",fontWeight:700,color:"#f0f0fa" }}>{consultant.trim().split(" ")[0]}</div>
                <div style={{ fontSize:"11px",color:"#6e6e88" }}>Dia {popup.day} · {month} {year} ({WD_FULL[(new Date(year,monthIdx,popup.day).getDay()+6)%7]})</div>
              </div>
              <button onMouseDown={e=>e.stopPropagation()} onClick={()=>setPopup(null)} style={{ background:"#2a2a3a",border:"none",color:"#6e6e88",borderRadius:"8px",width:"28px",height:"28px",cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✕</button>
            </div>
          </div>
          {/* Entries com scroll */}
          <div style={{ display:"flex",flexDirection:"column",gap:"8px",overflowY:"auto",padding:"12px 16px 16px",maxHeight:"calc(80vh - 70px)" }}>
            {(popup.entries||[]).map((entry,ei)=>{
              const color = getColor(entry);
              return (
                <div key={entry.id||ei} style={{ background:"#0d0d14",borderRadius:"8px",border:"1px solid #2a2a3a",overflow:"hidden" }}>
                  {/* Color bar header */}
                  <div style={{ background:color,padding:"6px 10px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <span style={{ fontSize:"12px",fontWeight:800,color:"#fff" }}>{entry.client||TYPE_LABEL[entry.type]||entry.type}</span>
                    <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
                      {entry.modalidade && <span title={entry.modalidade==="presencial"?"Presencial":"Remoto"} style={{ fontSize:"12px" }}>{entry.modalidade==="remoto"?"💻":"🏢"}</span>}
                      {(entry.horaInicio||entry.horaFim) && (
                        <span style={{ fontSize:"10px",color:"rgba(255,255,255,0.85)",fontWeight:600 }}>
                          {entry.horaInicio||""}{entry.horaFim?" → "+entry.horaFim:""}{entry.intervalo?" ☕"+entry.intervalo+"m":""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ padding:"8px 10px",display:"flex",flexDirection:"column",gap:"6px" }}>
                    {/* Type badge + modalidade */}
                    <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                      <div style={{ fontSize:"11px",color:"#6e6e88" }}>{TYPE_LABEL[entry.type]||entry.type}</div>
                      {entry.modalidade && (
                        <div style={{ fontSize:"11px",fontWeight:600,padding:"2px 8px",borderRadius:"20px",
                          background:entry.modalidade==="remoto"?"#6366f122":"#10b98122",
                          color:entry.modalidade==="remoto"?"#818cf8":"#10b981"
                        }}>{entry.modalidade==="remoto"?"💻 Remoto":"🏢 Presencial"}</div>
                      )}
                    </div>
                    {/* Horário detail */}
                    {(entry.horaInicio||entry.horaFim||entry.intervalo) && (
                      <div style={{ background:"#18181f",borderRadius:"6px",padding:"6px 8px",fontSize:"11px",color:"#6e6e88",display:"flex",gap:"12px",flexWrap:"wrap" }}>
                        {entry.horaInicio && <span>🕐 Início: <strong style={{ color:"#f0f0fa" }}>{entry.horaInicio}</strong></span>}
                        {entry.horaFim && <span>🕔 Fim: <strong style={{ color:"#f0f0fa" }}>{entry.horaFim}</strong></span>}
                        {entry.intervalo && <span>☕ Intervalo: <strong style={{ color:"#f0f0fa" }}>{entry.intervalo}min</strong></span>}
                      </div>
                    )}
                    {/* Atividades */}
                    {entry.atividades && (
                      <div style={{ background:"#18181f",borderRadius:"6px",padding:"6px 8px" }}>
                        <div style={{ fontSize:"10px",fontWeight:700,color:"#6e6e88",marginBottom:"3px",textTransform:"uppercase",letterSpacing:"0.5px" }}>Atividades</div>
                        <div style={{ fontSize:"11px",color:"#6e6e88",lineHeight:"1.6",whiteSpace:"pre-wrap" }}>{entry.atividades}</div>
                      </div>
                    )}
                    {/* Histórico */}
                    {(entry.historico||[]).length>0 && (
                      <div style={{ borderTop:"1px solid #18181f",paddingTop:"6px" }}>
                        <div style={{ fontSize:"10px",fontWeight:700,color:"#6e6e88",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.5px" }}>Histórico</div>
                        {entry.historico.map((h,hi)=>(
                          <div key={hi} style={{ fontSize:"10px",color:"#6e6e88",marginBottom:"3px" }}>
                            <span style={{ color:h.acao==="criado"?"#22c55e":h.acao==="alterado"?"#f59e0b":"#ef4444",marginRight:"4px" }}>{h.acao==="criado"?"＋":h.acao==="alterado"?"✎":"✕"}</span>
                            <span style={{ color:"#6e6e88",fontWeight:600 }}>{h.por}</span>
                            <span style={{ color:"#6e6e88" }}> · {formatDateTime(h.em)}</span>
                            {h.alteracoes&&h.alteracoes.length>0&&(
                              <div style={{ marginTop:"2px",paddingLeft:"14px" }}>
                                {h.alteracoes.map((a,ai)=>(
                                  <div key={ai} style={{ fontSize:"9px",color:"#6e6e88" }}>
                                    <span style={{ color:"#6e6e88" }}>{a.campo}:</span> <span style={{ textDecoration:"line-through",color:"#ef444488" }}>{a.de}</span> → <span style={{ color:"#22d3a0" }}>{a.para}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
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
            <th style={{ padding:"10px 16px",textAlign:"left",fontSize:"12px",fontWeight:700,color:"#6e6e88",position:"sticky",left:0,background:"#0d0d14",zIndex:1 }}>Consultor</th>
            {displayMonths.map(m=><th key={m} style={{ padding:"10px 8px",textAlign:"center",fontSize:"11px",fontWeight:600,color:"#6e6e88",minWidth:"80px" }}>{m.slice(0,3)}</th>)}
          </tr>
        </thead>
        <tbody>
          {consultores.map((name,idx)=>(
            <tr key={name} style={{ borderTop:"1px solid #18181f" }}>
              <td style={{ padding:"10px 16px",fontSize:"13px",fontWeight:600,color:"#2a2a3a",position:"sticky",left:0,background:"#0d0d14",zIndex:1,whiteSpace:"nowrap" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                  <div style={{ width:"28px",height:"28px",borderRadius:"50%",background:"hsl("+(idx*29%360)+",65%,50%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:700,color:"#fff",flexShrink:0 }}>{getInitials(name)}</div>
                  {name.trim().split(" ").slice(0,2).join(" ")}
                </div>
              </td>
              {displayMonths.map(m=>{
                const {total,top,vacation} = getMonthSummary(name,m);
                if (vacation>0&&total===0) return <td key={m} style={{ padding:"4px" }}><div style={{ background:"#22c55e22",border:"1px solid #22c55e44",borderRadius:"6px",padding:"6px 4px",textAlign:"center" }}><div style={{ fontSize:"10px",color:"#22d3a0",fontWeight:600 }}>FÉRIAS</div></div></td>;
                if (!total) return <td key={m} style={{ padding:"4px" }}><div style={{ height:"36px",borderRadius:"6px",background:"#18181f44" }}/></td>;
                const color = top ? getClientColor(top[0]) : "#3b82f6";
                return <td key={m} style={{ padding:"4px" }}><div style={{ background:color+"22",border:"1px solid "+color+"44",borderRadius:"6px",padding:"6px 4px",textAlign:"center" }}><div style={{ fontSize:"9px",color:color,fontWeight:700,lineHeight:1.2 }}>{top?.[0]?.slice(0,7)||""}</div><div style={{ fontSize:"10px",color:"#6e6e88",marginTop:"1px" }}>{total}d</div></div></td>;
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
      <div style={{ background:"#18181f",borderRadius:"12px",padding:"24px",border:"1px solid #2a2a3a" }}>
        <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"15px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"20px" }}>🏆 Top Clientes por Dias</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
          {stats.topClients.map(([client,days],i)=>{
            const color = getClientColor(client);
            const pct = Math.round((days/(stats.topClients[0]?.[1]||1))*100);
            return (
              <div key={client}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}>
                  <span style={{ fontSize:"13px",color:"#2a2a3a",fontWeight:500 }}><span style={{ color:"#6e6e88",marginRight:"8px" }}>#{i+1}</span>{client}</span>
                  <span style={{ fontSize:"13px",color:color,fontWeight:700 }}>{days} dias</span>
                </div>
                <div style={{ height:"6px",background:"#2a2a3a",borderRadius:"3px",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:pct+"%",background:color,borderRadius:"3px" }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background:"#18181f",borderRadius:"12px",padding:"24px",border:"1px solid #2a2a3a" }}>
        <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"15px",fontWeight:700,color:"#f0f0fa",marginTop:0,marginBottom:"20px" }}>👥 Produtividade por Consultor</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
          {stats.consultorStats.filter(c=>c.working>0).map((c,i)=>{
            const pct = Math.round((c.working/maxDays)*100);
            const hue = (i*37)%360;
            return (
              <div key={c.name}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"3px" }}>
                  <span style={{ fontSize:"12px",color:"#2a2a3a" }}>{c.name.trim().split(" ").slice(0,2).join(" ")}</span>
                  <div style={{ display:"flex",gap:"8px" }}>
                    <span style={{ fontSize:"12px",color:"#6e6e88" }}>{c.working}d</span>
                    {c.vacation>0&&<span style={{ fontSize:"12px",color:"#22d3a0" }}>🏖 {c.vacation}d</span>}
                  </div>
                </div>
                <div style={{ height:"5px",background:"#2a2a3a",borderRadius:"3px",overflow:"hidden" }}>
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
  editor:    { label:"Editor",        color:"#6c63ff", bg:"#3b82f618" },
  viewer:    { label:"Visualizador",  color:"#6e6e88", bg:"#6e6e8818" },
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
      setResetMsg("✅ E-mail de recuperação enviado!");
    } catch(e) {
      setResetMsg("⚠️ E-mail não encontrado ou erro ao enviar.");
    }
  };

  const inp = { padding:"12px 16px", borderRadius:"12px", border:"1px solid #2a2a3a", background:"#0d0d14", color:"#c8c8d8", fontSize:"14px", width:"100%", boxSizing:"border-box", outline:"none", fontFamily:"inherit", transition:"border-color .15s,box-shadow .15s" };

  return (
    <div style={{ fontFamily:"'Outfit',sans-serif", background:"#09090f", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", position:"relative", overflow:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Cabinet+Grotesk:wght@700;900&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-10px) rotate(2deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes orb{0%,100%{transform:scale(1) translate(0,0)}50%{transform:scale(1.1) translate(10px,-10px)}}
        .login-inp:focus{border-color:#6c63ff!important;box-shadow:0 0 0 3px #6c63ff20!important;}
        .login-btn:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 8px 32px #6c63ff55!important;}
        .login-btn{transition:all .2s cubic-bezier(.4,0,.2,1);}
      `}</style>

      {/* Background orbs */}
      <div style={{ position:"absolute",top:"-160px",left:"-160px",width:"500px",height:"500px",borderRadius:"50%",background:"radial-gradient(circle,#6c63ff1a 0%,transparent 65%)",pointerEvents:"none",animation:"orb 8s ease-in-out infinite" }}/>
      <div style={{ position:"absolute",bottom:"-120px",right:"-100px",width:"400px",height:"400px",borderRadius:"50%",background:"radial-gradient(circle,#a78bfa14 0%,transparent 65%)",pointerEvents:"none",animation:"orb 10s ease-in-out infinite reverse" }}/>
      <div style={{ position:"absolute",top:"40%",right:"10%",width:"200px",height:"200px",borderRadius:"50%",background:"radial-gradient(circle,#22d3a00e 0%,transparent 70%)",pointerEvents:"none" }}/>

      <div style={{ width:"100%", maxWidth:"420px", animation:"fadeUp .45s cubic-bezier(.4,0,.2,1)" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"40px" }}>
          <div style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:"68px",height:"68px",borderRadius:"20px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",marginBottom:"22px",boxShadow:"0 0 48px #6c63ff55",animation:"float 5s ease-in-out infinite",fontSize:"30px" }}>◈</div>
          <h1 style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"26px", fontWeight:900, color:"#f0f0fa", margin:"0 0 8px", letterSpacing:"-0.7px" }}>Agenda de Consultores</h1>
          <p style={{ color:"#3e3e55", fontSize:"13px", margin:0, fontWeight:500 }}>Acesse sua conta para continuar</p>
        </div>

        {!showReset ? (
          <div style={{ background:"#111118", borderRadius:"22px", padding:"34px", border:"1px solid #1f1f2e", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>
              <div>
                <label style={{ fontSize:"11px", color:"#3e3e55", fontWeight:700, display:"block", marginBottom:"8px", letterSpacing:"1px", textTransform:"uppercase" }}>E-mail</label>
                <input className="login-inp" type="email" value={email} onChange={e=>{ setEmail(e.target.value); setError(""); }} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="seu@email.com" style={inp} autoFocus />
              </div>
              <div>
                <label style={{ fontSize:"11px", color:"#3e3e55", fontWeight:700, display:"block", marginBottom:"8px", letterSpacing:"1px", textTransform:"uppercase" }}>Senha</label>
                <div style={{ position:"relative" }}>
                  <input className="login-inp" type={showPass?"text":"password"} value={password} onChange={e=>{ setPassword(e.target.value); setError(""); }} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="••••••••" style={{...inp, paddingRight:"46px"}} />
                  <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#3e3e55", cursor:"pointer", fontSize:"15px", padding:0 }}>{showPass?"🙈":"👁"}</button>
                </div>
              </div>
              {error && (
                <div style={{ padding:"11px 14px", borderRadius:"11px", background:"#f04f5e12", border:"1px solid #f04f5e30", color:"#f87171", fontSize:"13px", display:"flex",alignItems:"center",gap:"8px" }}>
                  <span>⚠️</span>{error}
                </div>
              )}
              <button className="login-btn" onClick={handleSubmit} disabled={loading}
                style={{ padding:"14px", borderRadius:"12px", border:"none", background:loading?"#1f1f2e":`linear-gradient(135deg,#6c63ff,#a78bfa)`, color:loading?"#3e3e55":"#fff", fontWeight:700, fontSize:"14px", cursor:loading?"not-allowed":"pointer", boxShadow:loading?"none":"0 4px 24px #6c63ff44", marginTop:"4px", fontFamily:"inherit", letterSpacing:"0.3px" }}>
                {loading ? "⏳ Verificando..." : "Entrar →"}
              </button>
              <button onClick={()=>{ setShowReset(true); setResetEmail(email); }}
                style={{ background:"none", border:"none", color:"#3e3e55", fontSize:"12px", cursor:"pointer", padding:0, textAlign:"center", fontFamily:"inherit" }}>
                Esqueci minha senha
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background:"#111118", borderRadius:"22px", padding:"34px", border:"1px solid #1f1f2e", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }}>
            <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"18px", fontWeight:900, color:"#f0f0fa", marginTop:0, marginBottom:"8px", letterSpacing:"-0.3px" }}>Recuperar senha</h2>
            <p style={{ fontSize:"13px", color:"#3e3e55", marginBottom:"22px", lineHeight:"1.6" }}>Digite seu e-mail e enviaremos um link para redefinir sua senha.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
              <input className="login-inp" type="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} placeholder="seu@email.com" style={inp} autoFocus />
              {resetMsg && (
                <div style={{ padding:"11px 14px", borderRadius:"11px", background:resetMsg.startsWith("✅")?"#22d3a015":"#f04f5e12", border:"1px solid "+(resetMsg.startsWith("✅")?"#22d3a030":"#f04f5e30"), color:resetMsg.startsWith("✅")?"#34d399":"#f87171", fontSize:"13px" }}>
                  {resetMsg}
                </div>
              )}
              <button className="login-btn" onClick={handleReset}
                style={{ padding:"13px", borderRadius:"12px", border:"none", background:"linear-gradient(135deg,#6c63ff,#a78bfa)", color:"#fff", fontWeight:700, fontSize:"13px", cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 24px #6c63ff44" }}>
                📧 Enviar link de recuperação
              </button>
              <button onClick={()=>{ setShowReset(false); setResetMsg(""); }}
                style={{ background:"none", border:"none", color:"#3e3e55", fontSize:"12px", cursor:"pointer", padding:0, textAlign:"center", fontFamily:"inherit" }}>
                ← Voltar ao login
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign:"center", fontSize:"11px", color:"#1f1f2e", marginTop:"24px", letterSpacing:"0.3px" }}>
          Desenvolvido por Marcelo Alexandre · Todos os direitos reservados
        </p>
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
  const [novoModulos, setNovoModulos] = useState(null); // null = todos
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
      const perfil = { email: novoEmail.trim(), nome: novoNome.trim(), role: novoRole, consultorName: novoRole === "consultor" ? novoConsultor : "", ...(uid ? { uid } : {}), ...(novoModulos ? { modulosHabilitados: novoModulos } : {}) };
      const ref = await addDoc(collection(db, "usuarios"), perfil);
      setUsuarios(prev => [...prev, { id: ref.id, ...perfil }]);
      if (novoRole === "consultor" && novoConsultor && !consultores.includes(novoConsultor)) {
        onAddConsultor && onAddConsultor({ name: novoConsultor, codigo:"", email: novoEmail.trim() });
      }
      setNovoEmail(""); setNovaSenha(""); setNovoNome(""); setNovoConsultor(""); setNovoRole("viewer"); setNovoModulos(null);
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
        onAddConsultor && onAddConsultor({ name: editFields.consultorName, codigo:"", email:"" });
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

  const inp = { padding:"8px 12px", borderRadius:"8px", border:"1px solid #2a2a3a", background:"#0d0d14", color:"#c8c8d8", fontSize:"13px", width:"100%", boxSizing:"border-box" };

  // Módulos disponíveis por perfil
  const MODULOS_POR_PERFIL = {
    admin:     [{ id:"home",icon:"⬡",label:"Dashboard"},{ id:"agenda",icon:"📅",label:"Agenda"},{ id:"viagens",icon:"✈️",label:"Viagens"},{ id:"projetos",icon:"📋",label:"Projetos"},{ id:"cadastros",icon:"🗂",label:"Cadastros"}],
    editor:    [{ id:"home",icon:"⬡",label:"Dashboard"},{ id:"agenda",icon:"📅",label:"Agenda"},{ id:"viagens",icon:"✈️",label:"Viagens"},{ id:"projetos",icon:"📋",label:"Projetos"}],
    viewer:    [{ id:"agenda",icon:"📅",label:"Agenda"},{ id:"viagens",icon:"✈️",label:"Viagens"}],
    consultor: [{ id:"agenda",icon:"📅",label:"Agenda"},{ id:"grade",icon:"🎓",label:"Grade de Conhecimento"},{ id:"viagens",icon:"✈️",label:"Viagens"}],
  };

  const ModulosToggle = ({ role, value, onChange }) => {
    const disponiveis = MODULOS_POR_PERFIL[role] || [];
    const habilitados = value || disponiveis.map(m=>m.id); // null/undefined = todos
    const toggle = (id) => {
      const next = habilitados.includes(id) ? habilitados.filter(x=>x!==id) : [...habilitados,id];
      onChange(next.length === disponiveis.length ? null : next); // null = todos habilitados
    };
    const allOn = !value || value.length === disponiveis.length;
    return (
      <div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px" }}>
          <label style={{ fontSize:"11px",color:"#6e6e88",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase" }}>Módulos habilitados</label>
          <button onClick={()=>onChange(null)} style={{ fontSize:"10px",background:"none",border:"none",color:"#6c63ff",cursor:"pointer",fontWeight:600,fontFamily:"inherit" }}>
            {allOn?"✓ Todos":"Habilitar todos"}
          </button>
        </div>
        <div style={{ display:"flex",flexWrap:"wrap",gap:"6px" }}>
          {disponiveis.map(m=>{
            const on = habilitados.includes(m.id);
            return (
              <button key={m.id} onClick={()=>toggle(m.id)}
                style={{ padding:"5px 12px",borderRadius:"8px",border:"1px solid "+(on?"#6c63ff":"#2a2a3a"),background:on?"#6c63ff22":"transparent",color:on?"#a78bfa":"#6e6e88",fontSize:"12px",fontWeight:on?700:400,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"5px",transition:"all .15s" }}>
                <span>{m.icon}</span> {m.label}
                {on && <span style={{ color:"#6c63ff",fontSize:"10px" }}>✓</span>}
              </button>
            );
          })}
        </div>
        {!allOn && <div style={{ fontSize:"10px",color:"#3e3e55",marginTop:"6px" }}>{habilitados.length} de {disponiveis.length} módulos habilitados</div>}
      </div>
    );
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:"#18181f", borderRadius:"16px", padding:"28px", width:"100%", maxWidth:"660px", border:"1px solid #2a2a3a", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"18px", fontWeight:700, color:"#f0f0fa", margin:0 }}>👥 Gerenciar Usuários</h2>
          <button onClick={onClose} style={{ background:"#2a2a3a", border:"none", color:"#6e6e88", borderRadius:"8px", width:"32px", height:"32px", cursor:"pointer", fontSize:"16px" }}>✕</button>
        </div>

        {/* Lista de usuários */}
        <div style={{ marginBottom:"24px" }}>
          <h3 style={{ fontSize:"13px", fontWeight:700, color:"#6e6e88", marginBottom:"10px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Usuários cadastrados</h3>
          {loading ? <p style={{ color:"#6e6e88", fontSize:"13px" }}>Carregando...</p> : (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {usuarios.map(u => {
                const badge = ROLE_BADGES[u.role] || ROLE_BADGES.viewer;
                const isEditing = editId === u.id;
                return (
                  <div key={u.id} style={{ background:"#0d0d14", borderRadius:"10px", border:"1px solid " + (isEditing ? "#3b82f6" : "#18181f"), overflow:"hidden" }}>
                    {/* Linha principal */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px" }}>
                      <div>
                        <div style={{ fontSize:"13px", fontWeight:600, color:"#f0f0fa" }}>{u.nome} <span style={{ fontSize:"11px", color:"#6e6e88" }}>· {u.email}</span></div>
                        <div style={{ display:"flex", gap:"8px", marginTop:"3px" }}>
                          <span style={{ fontSize:"11px", fontWeight:700, color:badge.color, background:badge.bg, padding:"1px 8px", borderRadius:"10px" }}>{badge.label}</span>
                          {u.consultorName && <span style={{ fontSize:"11px", color:"#6e6e88" }}>{u.consultorName}</span>}
                          {u.modulosHabilitados && <span style={{ fontSize:"10px", color:"#3e3e55", padding:"1px 7px", borderRadius:"99px", background:"#1f1f2e" }}>🔧 {u.modulosHabilitados.length} módulo{u.modulosHabilitados.length!==1?"s":""}</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:"6px" }}>
                        <button onClick={()=>isEditing ? setEditId(null) : handleEditStart(u)} style={{ background:isEditing?"#2a2a3a":"#6c63ff22", border:"1px solid "+(isEditing?"#6e6e88":"#6c63ff44"), color:isEditing?"#6e6e88":"#3b82f6", borderRadius:"6px", padding:"4px 10px", cursor:"pointer", fontSize:"12px", fontWeight:600 }}>{isEditing ? "✕" : "✏️ Editar"}</button>
                        <button onClick={()=>handleDelete(u.id, u.email)} style={{ background:"#ef444422", border:"1px solid #ef444444", color:"#ef4444", borderRadius:"6px", padding:"4px 10px", cursor:"pointer", fontSize:"12px", fontWeight:600 }}>🗑</button>
                      </div>
                    </div>
                    {/* Painel de edição inline */}
                    {isEditing && (
                      <div style={{ padding:"14px", borderTop:"1px solid #18181f", background:"#0a1628" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
                          <div>
                            <label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"4px" }}>Nome</label>
                            <input value={editFields.nome} onChange={e=>setEditFields(f=>({...f,nome:e.target.value}))} style={inp} />
                          </div>
                          <div>
                            <label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"4px" }}>Perfil</label>
                            <select value={editFields.role} onChange={e=>setEditFields(f=>({...f,role:e.target.value}))} style={inp}>
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Visualizador</option>
                              <option value="consultor">Consultor</option>
                            </select>
                          </div>
                          {editFields.role === "consultor" && (
                            <div style={{ gridColumn:"1/-1" }}>
                              <label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"4px" }}>Consultor vinculado</label>
                              <select value={editFields.consultorName} onChange={e=>setEditFields(f=>({...f,consultorName:e.target.value}))} style={inp}>
                                <option value="">Selecione...</option>
                                {consultores.map(c=><option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          )}
                          <div style={{ gridColumn:"1/-1",background:"#111118",borderRadius:"10px",border:"1px solid #1f1f2e",padding:"12px" }}>
                            <ModulosToggle
                              role={editFields.role}
                              value={editFields.modulosHabilitados}
                              onChange={v=>setEditFields(f=>({...f,modulosHabilitados:v}))}
                            />
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                          <button onClick={()=>handleEditSave(u)} disabled={editSaving} style={{ padding:"7px 16px", borderRadius:"8px", border:"none", background:"#22d3a0", color:"#fff", fontWeight:700, fontSize:"12px", cursor:"pointer" }}>{editSaving ? "Salvando..." : "💾 Salvar"}</button>
                          <button onClick={()=>handleSendReset(u.email)} style={{ padding:"7px 16px", borderRadius:"8px", border:"1px solid #3b82f644", background:"#6c63ff22", color:"#6c63ff", fontWeight:600, fontSize:"12px", cursor:"pointer" }}>🔑 Reset de senha</button>
                          <button onClick={()=>setEditId(null)} style={{ padding:"7px 16px", borderRadius:"8px", border:"1px solid #2a2a3a", background:"transparent", color:"#6e6e88", fontWeight:600, fontSize:"12px", cursor:"pointer" }}>Cancelar</button>
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
        <div style={{ borderTop:"1px solid #2a2a3a", paddingTop:"20px" }}>
          <h3 style={{ fontSize:"13px", fontWeight:700, color:"#6e6e88", marginBottom:"14px", textTransform:"uppercase", letterSpacing:"0.05em" }}>➕ Novo usuário</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
            <div><label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"5px" }}>Nome *</label><input value={novoNome} onChange={e=>setNovoNome(e.target.value)} placeholder="Nome completo" style={inp}/></div>
            <div><label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"5px" }}>E-mail *</label><input type="email" value={novoEmail} onChange={e=>setNovoEmail(e.target.value)} placeholder="email@exemplo.com" style={inp}/></div>
            <div><label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"5px" }}>Senha (mín. 6 caracteres)</label><input type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} placeholder="••••••••" style={inp}/></div>
            <div><label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"5px" }}>Perfil *</label>
              <select value={novoRole} onChange={e=>setNovoRole(e.target.value)} style={inp}>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Visualizador</option>
                <option value="consultor">Consultor</option>
              </select>
            </div>
            {novoRole === "consultor" && (
              <div style={{ gridColumn:"1/-1" }}><label style={{ fontSize:"11px", color:"#6e6e88", fontWeight:600, display:"block", marginBottom:"5px" }}>Consultor vinculado *</label>
                <select value={novoConsultor} onChange={e=>setNovoConsultor(e.target.value)} style={inp}>
                  <option value="">Selecione o consultor...</option>
                  {consultores.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div style={{ gridColumn:"1/-1",background:"#111118",borderRadius:"10px",border:"1px solid #1f1f2e",padding:"12px" }}>
              <ModulosToggle role={novoRole} value={novoModulos} onChange={setNovoModulos}/>
            </div>
          </div>
          {error && <div style={{ padding:"8px 12px", borderRadius:"8px", background:"#ef444422", border:"1px solid #ef444444", color:"#ef4444", fontSize:"12px", marginBottom:"10px" }}>⚠️ {error}</div>}
          {success && <div style={{ padding:"8px 12px", borderRadius:"8px", background:"#22c55e22", border:"1px solid #22c55e44", color:"#22d3a0", fontSize:"12px", marginBottom:"10px" }}>{success}</div>}
          <button onClick={handleAdd} disabled={salvando} style={{ width:"100%", padding:"11px", borderRadius:"8px", border:"none", background:salvando?"#2a2a3a":"#22c55e", color:salvando?"#6e6e88":"#fff", fontWeight:700, fontSize:"14px", cursor:salvando?"not-allowed":"pointer" }}>
            {salvando ? "Criando usuário..." : "✅ Criar usuário"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO: SOLICITAÇÃO DE VIAGEM
// ─────────────────────────────────────────────────────────────────────────────
function ViagemCard({ viagem, STATUS_CONFIG, canManage, onEdit, onStatusChange, onDelete, onUpdateGastos }) {
  const [expandido, setExpandido] = useState(false);
  const st = STATUS_CONFIG[viagem.status]||STATUS_CONFIG.pendente;
  const totalGastos = (viagem.gastos||[]).reduce((s,g)=>s+Number(g.valor||0),0);
  return (
    <div style={{ background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e",overflow:"hidden" }}>
      <div style={{ padding:"16px 20px",display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap",cursor:"pointer" }} onClick={()=>setExpandido(e=>!e)}>
        <div style={{ fontSize:"22px" }}>✈️</div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa" }}>{viagem.destino||"(sem destino)"}</div>
          <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"2px",display:"flex",gap:"10px",flexWrap:"wrap" }}>
            <span>👤 {viagem.solicitante}</span>
            {viagem.dataIda && <span>📅 {viagem.dataIda}{viagem.dataVolta?" → "+viagem.dataVolta:""}</span>}
            {viagem.transporte && <span>🚗 {viagem.transporte}</span>}
            {totalGastos>0 && <span style={{ color:"#22d3a0" }}>💰 R$ {totalGastos.toFixed(2)}</span>}
          </div>
        </div>
        <span style={{ padding:"4px 12px",borderRadius:"99px",background:st.bg,border:"1px solid "+st.color+"44",fontSize:"11px",fontWeight:700,color:st.color,whiteSpace:"nowrap" }}>{st.label}</span>
        <span style={{ color:"#3e3e55",fontSize:"12px" }}>{expandido?"▴":"▾"}</span>
      </div>
      {expandido && (
        <div style={{ borderTop:"1px solid #1f1f2e",padding:"16px 20px" }}>
          {viagem.motivo && <p style={{ fontSize:"13px",color:"#c8c8d8",lineHeight:1.6,marginBottom:"14px" }}><strong style={{ color:"#6e6e88" }}>Motivo:</strong> {viagem.motivo}</p>}
          {viagem.observacoes && <p style={{ fontSize:"13px",color:"#c8c8d8",lineHeight:1.6,marginBottom:"14px" }}><strong style={{ color:"#6e6e88" }}>Obs:</strong> {viagem.observacoes}</p>}
          <div style={{ marginBottom:"16px" }}>
            <div style={{ fontSize:"11px",color:"#6e6e88",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:"10px" }}>Lançamento de gastos</div>
            <GastosViagem viagem={viagem} onAtualizar={onUpdateGastos}/>
          </div>
          <div style={{ display:"flex",gap:"8px",flexWrap:"wrap" }}>
            <button onClick={(e)=>{e.stopPropagation();onEdit(viagem);setExpandido(false);}}
              style={{ padding:"7px 16px",borderRadius:"8px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit" }}>✏️ Editar</button>
            {canManage && (
              <>
                {Object.entries(STATUS_CONFIG).filter(([k])=>k!==viagem.status).map(([k,v])=>(
                  <button key={k} onClick={(e)=>{e.stopPropagation();onStatusChange(viagem.id,k);}}
                    style={{ padding:"7px 14px",borderRadius:"8px",border:"1px solid "+v.color+"44",background:v.bg,color:v.color,cursor:"pointer",fontSize:"11px",fontWeight:600,fontFamily:"inherit" }}>→ {v.label}</button>
                ))}
                <button onClick={(e)=>{e.stopPropagation();onDelete(viagem.id);}}
                  style={{ padding:"7px 14px",borderRadius:"8px",border:"1px solid #f04f5e44",background:"#f04f5e18",color:"#f04f5e",cursor:"pointer",fontSize:"11px",fontWeight:600,fontFamily:"inherit" }}>🗑 Excluir</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ModuloViagens({ currentUser, canEdit, canManage, consultores, theme: T }) {
  const [viagens, setViagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("lista"); // lista | nova | relatorio

  const isConsultor = currentUser.role === "consultor";
  const nomeUsuario = currentUser.consultorName || currentUser.nome || currentUser.username || "";

  const STATUS_CONFIG = {
    pendente:  { label:"Pendente",   color:"#f5a623", bg:"#f5a62318" },
    aprovada:  { label:"Aprovada",   color:"#22d3a0", bg:"#22d3a018" },
    rejeitada: { label:"Rejeitada",  color:"#f04f5e", bg:"#f04f5e18" },
    realizada: { label:"Realizada",  color:"#6c63ff", bg:"#6c63ff18" },
    reembolso: { label:"Reembolso",  color:"#a78bfa", bg:"#a78bfa18" },
  };

  // Carregar do Firestore
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "app_data", "viagens_all"));
        if (snap.exists()) setViagens(snap.data().value || []);
      } catch(e) { console.warn(e); }
      setLoading(false);
    };
    load();
  }, []);

  const salvarViagens = async (lista) => {
    setViagens(lista);
    await setDoc(doc(db, "app_data", "viagens_all"), { value: lista });
  };

  const viagensFiltradas = isConsultor
    ? viagens.filter(v => v.solicitante === nomeUsuario)
    : viagens;

  const card = { background:T.surface,borderRadius:"14px",border:"1px solid "+T.border,padding:"18px 20px",marginBottom:"10px" };
  const inp  = { padding:"9px 13px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",width:"100%",boxSizing:"border-box",fontFamily:"inherit" };
  const lbl  = { fontSize:"11px",color:"#6e6e88",fontWeight:700,display:"block",marginBottom:"6px",letterSpacing:"0.5px",textTransform:"uppercase" };

  const FormViagem = ({ inicial, onSalvar, onCancelar }) => {
    const [form, setForm] = useState(inicial || {
      solicitante: nomeUsuario, destino:"", dataIda:"", dataVolta:"", motivo:"",
      transporte:"aéreo", hospedagem:false, adiantamento:"", observacoes:"",
      status:"pendente", gastos:[], docs:[]
    });
    const set = (k,v) => setForm(p=>({...p,[k]:v}));
    return (
      <div style={{ background:T.surface,borderRadius:"16px",border:"1px solid "+T.border,padding:"24px",maxWidth:"680px" }}>
        <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"17px",fontWeight:900,color:"#f0f0fa",margin:"0 0 20px",letterSpacing:"-0.3px" }}>
          {inicial?"✏️ Editar Solicitação":"✈️ Nova Solicitação de Viagem"}
        </h3>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px" }}>
          {canManage && (
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Consultor solicitante</label>
              <select value={form.solicitante} onChange={e=>set("solicitante",e.target.value)} style={inp}>
                {consultores.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Destino</label>
            <input value={form.destino} onChange={e=>set("destino",e.target.value)} placeholder="Ex: São Paulo, SP" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Data de ida</label>
            <input type="date" value={form.dataIda} onChange={e=>set("dataIda",e.target.value)} style={inp}/>
          </div>
          <div>
            <label style={lbl}>Data de volta</label>
            <input type="date" value={form.dataVolta} onChange={e=>set("dataVolta",e.target.value)} style={inp}/>
          </div>
          <div>
            <label style={lbl}>Transporte</label>
            <select value={form.transporte} onChange={e=>set("transporte",e.target.value)} style={inp}>
              {["aéreo","rodoviário","veículo próprio","locação"].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:"10px",paddingTop:"22px" }}>
            <input type="checkbox" id="hosp" checked={form.hospedagem} onChange={e=>set("hospedagem",e.target.checked)} style={{ width:"16px",height:"16px",accentColor:"#6c63ff" }}/>
            <label htmlFor="hosp" style={{ fontSize:"13px",color:"#c8c8d8",cursor:"pointer" }}>Necessita hospedagem</label>
          </div>
          <div>
            <label style={lbl}>Adiantamento solicitado (R$)</label>
            <input type="number" value={form.adiantamento} onChange={e=>set("adiantamento",e.target.value)} placeholder="0,00" style={inp}/>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Motivo / Objetivo da viagem</label>
            <textarea value={form.motivo} onChange={e=>set("motivo",e.target.value)} rows={3} placeholder="Descreva o motivo e objetivo da viagem..." style={{...inp,resize:"vertical",lineHeight:1.5}}/>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Observações</label>
            <textarea value={form.observacoes} onChange={e=>set("observacoes",e.target.value)} rows={2} placeholder="Informações adicionais..." style={{...inp,resize:"vertical",lineHeight:1.5}}/>
          </div>
          {canManage && (
            <div>
              <label style={lbl}>Status</label>
              <select value={form.status} onChange={e=>set("status",e.target.value)} style={inp}>
                {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ display:"flex",gap:"10px",marginTop:"20px",justifyContent:"flex-end" }}>
          <button onClick={onCancelar} style={{ padding:"9px 18px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontWeight:600,fontSize:"13px",fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={()=>onSalvar(form)} style={{ padding:"9px 22px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>
            {inicial?"💾 Salvar alterações":"✅ Enviar solicitação"}
          </button>
        </div>
      </div>
    );
  };

  // Relatório de gastos
  const GastosViagem = ({ viagem, onAtualizar }) => {
    const [gastos, setGastos] = useState(viagem.gastos||[]);
    const [novo, setNovo] = useState({ tipo:"alimentação", desc:"", valor:"", data:"" });
    const tipos = ["alimentação","transporte","hospedagem","combustível","pedágio","outros"];
    const total = gastos.reduce((s,g)=>s+Number(g.valor||0),0);
    const adiantar = async () => {
      const updated = {...viagem, gastos};
      onAtualizar(updated);
    };
    return (
      <div>
        <div style={{ marginBottom:"14px",display:"flex",gap:"10px",flexWrap:"wrap" }}>
          <select value={novo.tipo} onChange={e=>setNovo(p=>({...p,tipo:e.target.value}))} style={{...inp,width:"auto",flex:1}}>
            {tipos.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <input value={novo.desc} onChange={e=>setNovo(p=>({...p,desc:e.target.value}))} placeholder="Descrição" style={{...inp,flex:2}}/>
          <input type="number" value={novo.valor} onChange={e=>setNovo(p=>({...p,valor:e.target.value}))} placeholder="R$ valor" style={{...inp,width:"120px",flex:"none"}}/>
          <input type="date" value={novo.data} onChange={e=>setNovo(p=>({...p,data:e.target.value}))} style={{...inp,width:"140px",flex:"none"}}/>
          <button onClick={()=>{ if(!novo.valor) return; const ng=[...gastos,{...novo,id:Date.now()}]; setGastos(ng); setNovo({tipo:"alimentação",desc:"",valor:"",data:""}); onAtualizar({...viagem,gastos:ng}); }}
            style={{ padding:"9px 16px",borderRadius:"10px",border:"none",background:"#6c63ff",color:"#fff",cursor:"pointer",fontWeight:700,fontFamily:"inherit",whiteSpace:"nowrap" }}>+ Lançar</button>
        </div>
        {gastos.length>0 && (
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"12px" }}>
            <thead><tr style={{ borderBottom:"1px solid #2a2a3a" }}>
              {["Tipo","Descrição","Data","Valor",""].map(h=><th key={h} style={{ padding:"6px 8px",textAlign:"left",color:"#6e6e88",fontWeight:600 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {gastos.map((g,i)=>(
                <tr key={g.id||i} style={{ borderBottom:"1px solid #18181f" }}>
                  <td style={{ padding:"7px 8px",color:"#c8c8d8" }}>{g.tipo}</td>
                  <td style={{ padding:"7px 8px",color:"#c8c8d8" }}>{g.desc}</td>
                  <td style={{ padding:"7px 8px",color:"#6e6e88" }}>{g.data}</td>
                  <td style={{ padding:"7px 8px",color:"#22d3a0",fontWeight:700 }}>R$ {Number(g.valor).toFixed(2)}</td>
                  <td><button onClick={()=>{ const ng=gastos.filter((_,j)=>j!==i); setGastos(ng); onAtualizar({...viagem,gastos:ng}); }} style={{ background:"none",border:"none",color:"#f04f5e",cursor:"pointer",fontSize:"13px" }}>✕</button></td>
                </tr>
              ))}
              <tr style={{ borderTop:"2px solid #2a2a3a" }}>
                <td colSpan={3} style={{ padding:"8px",color:"#6e6e88",fontWeight:700,textAlign:"right" }}>Total:</td>
                <td style={{ padding:"8px",color:"#22d3a0",fontWeight:800,fontSize:"14px" }}>R$ {total.toFixed(2)}</td>
                <td/>
              </tr>
            </tbody>
          </table>
        )}
        {gastos.length===0 && <div style={{ textAlign:"center",padding:"20px",color:"#3e3e55",fontSize:"12px" }}>Nenhum gasto lançado ainda</div>}
      </div>
    );
  };

  if (loading) return <div style={{ textAlign:"center",padding:"60px",color:"#3e3e55" }}><div style={{ width:"28px",height:"28px",border:"3px solid #1f1f2e",borderTop:"3px solid #6c63ff",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto 12px" }}/></div>;

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"24px",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:"0 0 4px",letterSpacing:"-0.3px" }}>✈️ Solicitações de Viagem</h2>
          <p style={{ fontSize:"12px",color:"#3e3e55",margin:0 }}>{viagensFiltradas.length} solicitação{viagensFiltradas.length!==1?"ões":""}</p>
        </div>
        <div style={{ display:"flex",gap:"8px",alignItems:"center" }}>
          {/* Resumo por status */}
          {Object.entries(STATUS_CONFIG).map(([k,v])=>{
            const qtd = viagensFiltradas.filter(vi=>vi.status===k).length;
            if (!qtd) return null;
            return <div key={k} style={{ padding:"4px 10px",borderRadius:"99px",background:v.bg,border:"1px solid "+v.color+"44",fontSize:"11px",fontWeight:700,color:v.color }}>{qtd} {v.label}</div>;
          })}
          <button onClick={()=>{setEditando(null);setShowForm(true);}}
            style={{ padding:"8px 18px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>
            + Nova Solicitação
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ marginBottom:"24px" }}>
          <FormViagem
            inicial={editando}
            onSalvar={async (dados) => {
              let nova;
              if (editando) {
                nova = viagens.map(v=>v.id===editando.id?{...dados,id:editando.id,atualizadoEm:new Date().toISOString()}:v);
              } else {
                nova = [...viagens, {...dados, id:Date.now().toString(36), criadoEm:new Date().toISOString()}];
              }
              await salvarViagens(nova);
              setShowForm(false); setEditando(null);
            }}
            onCancelar={()=>{setShowForm(false);setEditando(null);}}
          />
        </div>
      )}

      {viagensFiltradas.length===0 && !showForm && (
        <div style={{ textAlign:"center",padding:"60px",background:"#111118",borderRadius:"16px",border:"1px solid #1f1f2e" }}>
          <div style={{ fontSize:"48px",marginBottom:"14px" }}>✈️</div>
          <div style={{ fontSize:"14px",color:"#3e3e55",marginBottom:"16px" }}>Nenhuma solicitação de viagem</div>
          <button onClick={()=>setShowForm(true)} style={{ padding:"9px 22px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit" }}>Criar primeira solicitação</button>
        </div>
      )}

      <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
        {viagensFiltradas.sort((a,b)=>new Date(b.criadoEm||0)-new Date(a.criadoEm||0)).map(viagem=>(
          <ViagemCard key={viagem.id} viagem={viagem} STATUS_CONFIG={STATUS_CONFIG} canManage={canManage}
            onEdit={(v)=>{setEditando(v);setShowForm(true);}}
            onStatusChange={async (id,status)=>{ const nova=viagens.map(x=>x.id===id?{...x,status}:x); await salvarViagens(nova); }}
            onDelete={async (id)=>{ if(window.confirm("Excluir esta solicitação?")) await salvarViagens(viagens.filter(x=>x.id!==id)); }}
            onUpdateGastos={async (v)=>{ const nova=viagens.map(x=>x.id===v.id?v:x); await salvarViagens(nova); }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO: GESTÃO DE PROJETOS
// ─────────────────────────────────────────────────────────────────────────────
function ModuloProjetos({ currentUser, canEdit, canManage, consultores, clients, theme: T }) {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projetoAtivo, setProjetoAtivo] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editandoProj, setEditandoProj] = useState(null);
  const [abaProj, setAbaProj] = useState("kanban"); // kanban | cronograma | horas

  const STATUS_PROJ = { planejamento:{label:"Planejamento",color:"#6e6e88"},andamento:{label:"Em andamento",color:"#6c63ff"},concluido:{label:"Concluído",color:"#22d3a0"},pausado:{label:"Pausado",color:"#f5a623"},cancelado:{label:"Cancelado",color:"#f04f5e"}};
  const COLUNAS = ["backlog","em_progresso","revisao","concluido"];
  const COL_LABELS = { backlog:"📋 Backlog", em_progresso:"⚙️ Em progresso", revisao:"👁 Revisão", concluido:"✅ Concluído" };
  const PRIORIDADES = { alta:{label:"Alta",color:"#f04f5e"}, media:{label:"Média",color:"#f5a623"}, baixa:{label:"Baixa",color:"#22d3a0"} };

  const inp = { padding:"9px 13px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"#0d0d14",color:"#c8c8d8",fontSize:"13px",width:"100%",boxSizing:"border-box",fontFamily:"inherit" };
  const lbl = { fontSize:"11px",color:"#6e6e88",fontWeight:700,display:"block",marginBottom:"6px",letterSpacing:"0.5px",textTransform:"uppercase" };

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "app_data", "projetos_mgmt"));
        if (snap.exists()) setProjetos(snap.data().value || []);
      } catch(e) { console.warn(e); }
      setLoading(false);
    };
    load();
  }, []);

  const salvarProjetos = async (lista) => {
    setProjetos(lista);
    await setDoc(doc(db, "app_data", "projetos_mgmt"), { value: lista });
  };

  const proj = projetos.find(p=>p.id===projetoAtivo);

  const atualizarProjeto = async (updated) => {
    const nova = projetos.map(p=>p.id===updated.id?updated:p);
    await salvarProjetos(nova);
  };

  const FormProjeto = ({ inicial, onSalvar, onCancelar }) => {
    const [form, setForm] = useState(inicial||{ nome:"", cliente:"", descricao:"", consultores:[], dataInicio:"", dataFim:"", status:"planejamento", progresso:0 });
    const set = (k,v) => setForm(p=>({...p,[k]:v}));
    const toggleCons = (c) => setForm(p=>({...p,consultores:p.consultores.includes(c)?p.consultores.filter(x=>x!==c):[...p.consultores,c]}));
    return (
      <div style={{ background:T.surface,borderRadius:"16px",border:"1px solid "+T.border,padding:"24px",maxWidth:"680px",marginBottom:"24px" }}>
        <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"17px",fontWeight:900,color:"#f0f0fa",margin:"0 0 20px",letterSpacing:"-0.3px" }}>{inicial?"✏️ Editar Projeto":"📋 Novo Projeto"}</h3>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px" }}>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Nome do projeto</label>
            <input value={form.nome} onChange={e=>set("nome",e.target.value)} placeholder="Ex: Implantação Protheus — Empresa X" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Cliente</label>
            <select value={form.cliente} onChange={e=>set("cliente",e.target.value)} style={inp}>
              <option value="">Selecione...</option>
              {clients.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select value={form.status} onChange={e=>set("status",e.target.value)} style={inp}>
              {Object.entries(STATUS_PROJ).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Data início</label>
            <input type="date" value={form.dataInicio} onChange={e=>set("dataInicio",e.target.value)} style={inp}/>
          </div>
          <div>
            <label style={lbl}>Data fim prevista</label>
            <input type="date" value={form.dataFim} onChange={e=>set("dataFim",e.target.value)} style={inp}/>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Descrição</label>
            <textarea value={form.descricao} onChange={e=>set("descricao",e.target.value)} rows={2} placeholder="Objetivo e escopo do projeto..." style={{...inp,resize:"vertical",lineHeight:1.5}}/>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Consultores envolvidos</label>
            <div style={{ display:"flex",flexWrap:"wrap",gap:"6px" }}>
              {consultores.map(c=>{
                const sel = form.consultores.includes(c);
                return <button key={c} onClick={()=>toggleCons(c)} style={{ padding:"5px 12px",borderRadius:"99px",border:"1px solid "+(sel?"#6c63ff":"#2a2a3a"),background:sel?"#6c63ff22":"transparent",color:sel?"#a78bfa":"#6e6e88",cursor:"pointer",fontSize:"12px",fontWeight:sel?700:400,fontFamily:"inherit" }}>{c.split(" ")[0]}</button>;
              })}
            </div>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Progresso ({form.progresso}%)</label>
            <input type="range" min={0} max={100} value={form.progresso} onChange={e=>set("progresso",Number(e.target.value))} style={{ width:"100%",accentColor:"#6c63ff" }}/>
          </div>
        </div>
        <div style={{ display:"flex",gap:"10px",marginTop:"20px",justifyContent:"flex-end" }}>
          <button onClick={onCancelar} style={{ padding:"9px 18px",borderRadius:"10px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontWeight:600,fontSize:"13px",fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={()=>onSalvar(form)} style={{ padding:"9px 22px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>
            {inicial?"💾 Salvar":"✅ Criar projeto"}
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ textAlign:"center",padding:"60px",color:"#3e3e55" }}><div style={{ width:"28px",height:"28px",border:"3px solid #1f1f2e",borderTop:"3px solid #6c63ff",borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto 12px" }}/></div>;

  // Visão de detalhe do projeto
  if (proj) {
    const tarefas = proj.tarefas || [];
    const horas = proj.horas || [];
    const totalHoras = horas.reduce((s,h)=>s+Number(h.horas||0),0);

    const addTarefa = async (col) => {
      const nome = window.prompt("Nome da tarefa:");
      if (!nome) return;
      const t = { id:Date.now().toString(36), nome, coluna:col, responsavel:"", prioridade:"media", desc:"", criadoEm:new Date().toISOString() };
      await atualizarProjeto({...proj, tarefas:[...tarefas,t]});
    };
    const moverTarefa = async (id, novaCol) => {
      await atualizarProjeto({...proj, tarefas:tarefas.map(t=>t.id===id?{...t,coluna:novaCol}:t)});
    };
    const removerTarefa = async (id) => {
      await atualizarProjeto({...proj, tarefas:tarefas.filter(t=>t.id!==id)});
    };
    const addHora = async () => {
      const cons = window.prompt("Consultor:");
      if (!cons) return;
      const hrs = window.prompt("Horas trabalhadas:");
      if (!hrs) return;
      const desc = window.prompt("Descrição da atividade:");
      const h = { id:Date.now().toString(36), consultor:cons, horas:Number(hrs), desc:desc||"", data:new Date().toISOString().slice(0,10) };
      await atualizarProjeto({...proj, horas:[...horas,h]});
    };

    const st = STATUS_PROJ[proj.status]||STATUS_PROJ.planejamento;
    return (
      <div>
        {/* Header do projeto */}
        <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px",flexWrap:"wrap" }}>
          <button onClick={()=>setProjetoAtivo(null)} style={{ padding:"6px 12px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontSize:"12px",fontFamily:"inherit" }}>← Voltar</button>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap" }}>
              <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:0,letterSpacing:"-0.3px" }}>{proj.nome}</h2>
              <span style={{ padding:"4px 12px",borderRadius:"99px",background:st.color+"18",border:"1px solid "+st.color+"44",fontSize:"11px",fontWeight:700,color:st.color }}>{st.label}</span>
            </div>
            <div style={{ fontSize:"12px",color:"#6e6e88",marginTop:"4px",display:"flex",gap:"12px",flexWrap:"wrap" }}>
              {proj.cliente && <span>🏢 {proj.cliente}</span>}
              {proj.dataInicio && <span>📅 {proj.dataInicio}{proj.dataFim?" → "+proj.dataFim:""}</span>}
              {proj.consultores?.length>0 && <span>👥 {proj.consultores.map(c=>c.split(" ")[0]).join(", ")}</span>}
              <span>⏱ {totalHoras}h registradas</span>
            </div>
          </div>
          <button onClick={()=>{setEditandoProj(proj);setShowForm(true);setProjetoAtivo(null);}}
            style={{ padding:"7px 14px",borderRadius:"8px",border:"1px solid #6c63ff44",background:"#6c63ff18",color:"#a78bfa",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit" }}>✏️ Editar</button>
        </div>

        {/* Barra de progresso */}
        <div style={{ background:"#111118",borderRadius:"10px",border:"1px solid #1f1f2e",padding:"12px 16px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"14px" }}>
          <span style={{ fontSize:"12px",color:"#6e6e88",whiteSpace:"nowrap" }}>Progresso:</span>
          <div style={{ flex:1,height:"8px",background:"#1f1f2e",borderRadius:"99px",overflow:"hidden" }}>
            <div style={{ height:"100%",width:(proj.progresso||0)+"%",background:"linear-gradient(90deg,#6c63ff,#a78bfa)",borderRadius:"99px",transition:"width .4s" }}/>
          </div>
          <span style={{ fontSize:"13px",fontWeight:700,color:"#a78bfa",minWidth:"40px" }}>{proj.progresso||0}%</span>
        </div>

        {/* Abas */}
        <div style={{ display:"flex",gap:"2px",background:"#0d0d14",borderRadius:"10px",padding:"3px",border:"1px solid #2a2a3a",marginBottom:"20px",width:"fit-content" }}>
          {[["kanban","📋 Kanban"],["cronograma","📊 Cronograma"],["horas","⏱ Horas"]].map(([v,l])=>(
            <button key={v} onClick={()=>setAbaProj(v)} style={{ padding:"6px 16px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"12px",fontFamily:"inherit",background:abaProj===v?"#6c63ff":"transparent",color:abaProj===v?"#fff":"#6e6e88" }}>{l}</button>
          ))}
        </div>

        {/* Kanban */}
        {abaProj==="kanban" && (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",overflowX:"auto" }}>
            {COLUNAS.map(col=>{
              const tarefasCol = tarefas.filter(t=>t.coluna===col);
              return (
                <div key={col} style={{ background:"#111118",borderRadius:"12px",border:"1px solid #1f1f2e",minHeight:"200px" }}>
                  <div style={{ padding:"12px 14px",borderBottom:"1px solid #1f1f2e",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <span style={{ fontSize:"12px",fontWeight:700,color:"#c8c8d8" }}>{COL_LABELS[col]}</span>
                    <span style={{ fontSize:"10px",background:"#1f1f2e",color:"#6e6e88",padding:"1px 7px",borderRadius:"99px",fontWeight:700 }}>{tarefasCol.length}</span>
                  </div>
                  <div style={{ padding:"8px" }}>
                    {tarefasCol.map(t=>{
                      const pr = PRIORIDADES[t.prioridade]||PRIORIDADES.media;
                      return (
                        <div key={t.id} style={{ background:"#18181f",borderRadius:"8px",border:"1px solid #2a2a3a",padding:"10px 12px",marginBottom:"6px" }}>
                          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"6px",marginBottom:"6px" }}>
                            <span style={{ fontSize:"12px",fontWeight:600,color:"#c8c8d8",lineHeight:1.4 }}>{t.nome}</span>
                            <span style={{ fontSize:"9px",padding:"2px 6px",borderRadius:"99px",background:pr.color+"18",color:pr.color,fontWeight:700,whiteSpace:"nowrap" }}>{pr.label}</span>
                          </div>
                          {t.responsavel && <div style={{ fontSize:"10px",color:"#6e6e88",marginBottom:"6px" }}>👤 {t.responsavel}</div>}
                          <div style={{ display:"flex",gap:"4px",flexWrap:"wrap" }}>
                            {COLUNAS.filter(c=>c!==col).map(c=>(
                              <button key={c} onClick={()=>moverTarefa(t.id,c)} style={{ fontSize:"9px",padding:"2px 7px",borderRadius:"99px",border:"1px solid #2a2a3a",background:"transparent",color:"#6e6e88",cursor:"pointer",fontFamily:"inherit" }}>→ {COL_LABELS[c].split(" ")[1]}</button>
                            ))}
                            <button onClick={()=>removerTarefa(t.id)} style={{ fontSize:"9px",padding:"2px 7px",borderRadius:"99px",border:"1px solid #f04f5e44",background:"transparent",color:"#f04f5e",cursor:"pointer",fontFamily:"inherit" }}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={()=>addTarefa(col)} style={{ width:"100%",padding:"7px",borderRadius:"8px",border:"1px dashed #2a2a3a",background:"transparent",color:"#3e3e55",cursor:"pointer",fontSize:"12px",fontFamily:"inherit",marginTop:"4px" }}>+ Adicionar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cronograma */}
        {abaProj==="cronograma" && (
          <div style={{ background:"#111118",borderRadius:"12px",border:"1px solid #1f1f2e",padding:"20px" }}>
            <h3 style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",margin:"0 0 16px" }}>📊 Linha do tempo</h3>
            {(!proj.dataInicio||!proj.dataFim) ? (
              <div style={{ textAlign:"center",padding:"32px",color:"#3e3e55",fontSize:"13px" }}>Defina as datas de início e fim do projeto para ver o cronograma.</div>
            ) : (
              <div>
                {/* Timeline visual */}
                {(() => {
                  const start = new Date(proj.dataInicio), end = new Date(proj.dataFim);
                  const total = (end-start)/(1000*60*60*24);
                  const hoje = new Date();
                  const elapsed = Math.max(0,Math.min(total,(hoje-start)/(1000*60*60*24)));
                  const pct = total>0?Math.round((elapsed/total)*100):0;
                  return (
                    <div>
                      <div style={{ display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#6e6e88",marginBottom:"6px" }}>
                        <span>🚀 {proj.dataInicio}</span>
                        <span>🏁 {proj.dataFim}</span>
                      </div>
                      <div style={{ height:"16px",background:"#1f1f2e",borderRadius:"99px",overflow:"hidden",position:"relative",marginBottom:"8px" }}>
                        <div style={{ height:"100%",width:pct+"%",background:"linear-gradient(90deg,#6c63ff,#a78bfa)",borderRadius:"99px" }}/>
                        <div style={{ position:"absolute",top:0,left:(proj.progresso||0)+"%",width:"2px",height:"100%",background:"#22d3a0" }}/>
                      </div>
                      <div style={{ display:"flex",gap:"16px",fontSize:"11px",color:"#6e6e88" }}>
                        <span>⏳ Tempo decorrido: <strong style={{ color:"#a78bfa" }}>{pct}%</strong></span>
                        <span>📈 Progresso real: <strong style={{ color:"#22d3a0" }}>{proj.progresso||0}%</strong></span>
                        <span>📅 Duração total: <strong style={{ color:"#c8c8d8" }}>{total} dias</strong></span>
                      </div>
                    </div>
                  );
                })()}
                <div style={{ marginTop:"20px" }}>
                  <div style={{ fontSize:"11px",color:"#6e6e88",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:"10px" }}>Tarefas por fase</div>
                  {COLUNAS.map(col=>{
                    const n = tarefas.filter(t=>t.coluna===col).length;
                    return n>0?(
                      <div key={col} style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"6px" }}>
                        <span style={{ fontSize:"12px",color:"#c8c8d8",minWidth:"140px" }}>{COL_LABELS[col]}</span>
                        <div style={{ flex:1,height:"6px",background:"#1f1f2e",borderRadius:"99px",overflow:"hidden" }}>
                          <div style={{ height:"100%",width:(n/tarefas.length*100)+"%",background:"#6c63ff",borderRadius:"99px" }}/>
                        </div>
                        <span style={{ fontSize:"11px",color:"#6e6e88",minWidth:"20px" }}>{n}</span>
                      </div>
                    ):null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Horas */}
        {abaProj==="horas" && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
              <div style={{ fontSize:"13px",color:"#c8c8d8" }}>Total: <strong style={{ color:"#22d3a0",fontSize:"18px" }}>{totalHoras}h</strong></div>
              <button onClick={addHora} style={{ padding:"7px 16px",borderRadius:"8px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"12px",fontFamily:"inherit" }}>+ Registrar horas</button>
            </div>
            {horas.length===0 && <div style={{ textAlign:"center",padding:"32px",background:"#111118",borderRadius:"12px",border:"1px solid #1f1f2e",color:"#3e3e55",fontSize:"13px" }}>Nenhuma hora registrada</div>}
            <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
              {horas.sort((a,b)=>b.data?.localeCompare(a.data||"")).map((h,i)=>(
                <div key={h.id||i} style={{ background:"#111118",borderRadius:"10px",border:"1px solid #1f1f2e",padding:"12px 16px",display:"flex",alignItems:"center",gap:"14px" }}>
                  <div style={{ width:"42px",height:"42px",borderRadius:"10px",background:"#22d3a018",border:"1px solid #22d3a033",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <span style={{ fontSize:"13px",fontWeight:800,color:"#22d3a0" }}>{h.horas}h</span>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:"13px",fontWeight:600,color:"#c8c8d8" }}>{h.consultor}</div>
                    <div style={{ fontSize:"11px",color:"#6e6e88",marginTop:"2px" }}>{h.desc||"—"}</div>
                  </div>
                  <div style={{ fontSize:"11px",color:"#3e3e55" }}>{h.data}</div>
                  <button onClick={()=>atualizarProjeto({...proj,horas:horas.filter((_,j)=>j!==i)})} style={{ background:"none",border:"none",color:"#f04f5e",cursor:"pointer",fontSize:"13px" }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Lista de projetos
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"24px",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <h2 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"20px",fontWeight:900,color:"#f0f0fa",margin:"0 0 4px",letterSpacing:"-0.3px" }}>📋 Gestão de Projetos</h2>
          <p style={{ fontSize:"12px",color:"#3e3e55",margin:0 }}>{projetos.length} projeto{projetos.length!==1?"s":""} cadastrado{projetos.length!==1?"s":""}</p>
        </div>
        {canEdit && <button onClick={()=>{setEditandoProj(null);setShowForm(true);}} style={{ padding:"8px 18px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",fontWeight:700,fontSize:"12px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #6c63ff44" }}>+ Novo Projeto</button>}
      </div>

      {showForm && (
        <FormProjeto inicial={editandoProj}
          onSalvar={async (dados)=>{
            let nova;
            if (editandoProj) nova=projetos.map(p=>p.id===editandoProj.id?{...dados,id:editandoProj.id}:p);
            else nova=[...projetos,{...dados,id:Date.now().toString(36),tarefas:[],horas:[],criadoEm:new Date().toISOString()}];
            await salvarProjetos(nova);
            setShowForm(false);setEditandoProj(null);
          }}
          onCancelar={()=>{setShowForm(false);setEditandoProj(null);}}
        />
      )}

      {projetos.length===0 && !showForm && (
        <div style={{ textAlign:"center",padding:"60px",background:"#111118",borderRadius:"16px",border:"1px solid #1f1f2e" }}>
          <div style={{ fontSize:"48px",marginBottom:"14px" }}>📋</div>
          <div style={{ fontSize:"14px",color:"#3e3e55",marginBottom:"16px" }}>Nenhum projeto cadastrado</div>
          {canEdit && <button onClick={()=>setShowForm(true)} style={{ padding:"9px 22px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:"13px",fontFamily:"inherit" }}>Criar primeiro projeto</button>}
        </div>
      )}

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:"14px" }}>
        {projetos.map(p=>{
          const st = STATUS_PROJ[p.status]||STATUS_PROJ.planejamento;
          const concluidas = (p.tarefas||[]).filter(t=>t.coluna==="concluido").length;
          const totalTar = (p.tarefas||[]).length;
          const totalH = (p.horas||[]).reduce((s,h)=>s+Number(h.horas||0),0);
          return (
            <div key={p.id} className="card-hover" onClick={()=>setProjetoAtivo(p.id)}
              style={{ background:"#111118",borderRadius:"14px",border:"1px solid #1f1f2e",padding:"18px 20px",cursor:"pointer",position:"relative",overflow:"hidden" }}>
              <div style={{ position:"absolute",top:0,left:0,right:0,height:"3px",background:st.color }}/>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px" }}>
                <div style={{ fontSize:"14px",fontWeight:700,color:"#f0f0fa",lineHeight:1.3,flex:1,marginRight:"10px" }}>{p.nome}</div>
                <span style={{ padding:"3px 10px",borderRadius:"99px",background:st.color+"18",border:"1px solid "+st.color+"44",fontSize:"10px",fontWeight:700,color:st.color,whiteSpace:"nowrap" }}>{st.label}</span>
              </div>
              {p.cliente && <div style={{ fontSize:"11px",color:"#6e6e88",marginBottom:"8px" }}>🏢 {p.cliente}</div>}
              <div style={{ height:"4px",background:"#1f1f2e",borderRadius:"99px",overflow:"hidden",marginBottom:"10px" }}>
                <div style={{ height:"100%",width:(p.progresso||0)+"%",background:"linear-gradient(90deg,#6c63ff,#a78bfa)",borderRadius:"99px" }}/>
              </div>
              <div style={{ display:"flex",gap:"14px",fontSize:"11px",color:"#6e6e88" }}>
                <span>📈 {p.progresso||0}%</span>
                {totalTar>0 && <span>📋 {concluidas}/{totalTar} tarefas</span>}
                {totalH>0 && <span>⏱ {totalH}h</span>}
                {p.consultores?.length>0 && <span>👥 {p.consultores.length}</span>}
              </div>
            </div>
          );
        })}
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
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#0d0d14", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet"/>
      <div style={{ fontSize:"48px" }}>📅</div>
      <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"20px", fontWeight:700, color:"#f0f0fa" }}>Agenda de Consultores</div>
      <div style={{ display:"flex", alignItems:"center", gap:"12px", color:"#6e6e88", fontSize:"14px" }}>
        <div style={{ width:"20px", height:"20px", border:"3px solid #2a2a3a", borderTop:"3px solid #3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
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
  const [selectedMonth, setSelectedMonth] = useState(()=> MONTHS_ORDER[new Date().getMonth()]);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // semanas a partir da semana atual
  const [searchClient, setSearchClient] = useState("");
  const [view, setView] = useState("calendario");
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [toast, setToast] = useState(null);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [activeModule, setActiveModule] = useState(isConsultor ? "agenda" : "home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [emailConfig, setEmailConfig] = useState(EMAIL_CONFIG_DEFAULT);
  const [consultorViewMode, setConsultorViewMode] = useState("mensal");

  const isDark = theme === "dark";
  const T = {
    bg:              isDark ? "#09090f"   : "#f5f5f7",
    surface:         isDark ? "#111118"   : "#ffffff",
    surface2:        isDark ? "#0d0d14"   : "#fafafa",
    surfaceHover:    isDark ? "#18181f"   : "#f0f0f5",
    border:          isDark ? "#1f1f2e"   : "#e4e4ea",
    border2:         isDark ? "#2a2a3a"   : "#d0d0da",
    text:            isDark ? "#c8c8d8"   : "#222233",
    text2:           isDark ? "#6e6e88"   : "#666677",
    text3:           isDark ? "#3e3e55"   : "#aaaabc",
    heading:         isDark ? "#f0f0fa"   : "#09090f",
    accent:          "#6c63ff",
    accentAlt:       "#a78bfa",
    accentHover:     "#5a52ee",
    accentGlow:      isDark ? "0 0 28px #6c63ff44" : "0 4px 16px #6c63ff33",
    success:         "#22d3a0",
    warning:         "#f5a623",
    danger:          "#f04f5e",
    headerBg:        isDark ? "#0c0c14"   : "#ffffff",
    headerBorder:    isDark ? "#1a1a28"   : "#e0e0ea",
    btnInactive:     isDark ? "#111118"   : "#f0f0f5",
    btnInactiveText: isDark ? "#6e6e88"   : "#555566",
    filterBg:        isDark ? "#111118"   : "#ffffff",
    inputBg:         isDark ? "#0d0d14"   : "#fafafa",
    inputBorder:     isDark ? "#2a2a3a"   : "#d0d0da",
    inputColor:      isDark ? "#c8c8d8"   : "#222233",
    cardBg:          isDark ? "#111118"   : "#ffffff",
    cardBorder:      isDark ? "#1f1f2e"   : "#e4e4ea",
    shadow:          isDark ? "0 2px 16px rgba(0,0,0,0.6)" : "0 2px 16px rgba(0,0,0,0.07)",
    shadowLg:        isDark ? "0 8px 48px rgba(0,0,0,0.8)" : "0 8px 48px rgba(0,0,0,0.12)",
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
      // Carregar metadados de consultores (código, email)
      const cm = await loadFromFirestore("consultores_meta", []);
      window.__consultoresMeta = cm || [];
      // Carregar usuários para notificações de e-mail
      try {
        const uSnap = await getDocs(collection(db, "usuarios"));
        setUsuarios(uSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e) {}
      // Carregar configuração de e-mail
      const ec = await loadFromFirestore("emailConfig", EMAIL_CONFIG_DEFAULT);
      setEmailConfig(ec);
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


  const consultores = Object.keys(scheduleData).sort((a,b)=>a.localeCompare(b,"pt-BR"));
  const clientColorMap = useMemo(()=>{ const m={}; clientList.forEach(c=>{ m[c.name]=c.color; }); return m; },[clientList]);

  const showToast = (msg,color) => { setToast({msg,color:color||"#22c55e"}); setTimeout(()=>setToast(null),3000); };

  const handleSaveEntry = (entry) => {
    const {id, consultor, month, year, days, client, type, modalidade, horaInicio, horaFim, intervalo, atividades, notifyEmail} = entry;
    const agora = new Date().toISOString();
    const nomeUsuario = currentUser.nome || currentUser.email;

    // Capturar criadoPor antes de atualizar o estado (para notificação de alteração)
    let criadoPorOriginal = nomeUsuario;
    if (id) {
      const existing = (scheduleData[consultor]||[]).find(e => e.id === id);
      criadoPorOriginal = existing?.criadoPor || nomeUsuario;
    }

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
            list[idx]={...old,client,type,modalidade,horaInicio,horaFim,intervalo,atividades,alteradoPor:nomeUsuario,alteradoEm:agora,historico:hist};
          }
        } else {
          // Nova entrada
          const newId = genId();
          list.push({id:newId,month,year,day,weekday:"-",client,type,modalidade,horaInicio,horaFim,intervalo,atividades,criadoPor:nomeUsuario,criadoEm:agora,historico:[{acao:"criado",por:nomeUsuario,em:agora}]});
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

    // Enviar notificação por e-mail se solicitado
    if (notifyEmail) {
      sendAgendaEmail({
        action:      id ? 'alterada' : 'nova',
        consultor, client, month, year, days,
        horaInicio, horaFim, intervalo, atividades, modalidade,
        criadoPor:   criadoPorOriginal,
        nomeUsuario,
      });
    }
  };

  const handleDeleteEntry = (consultor, entryId) => {
    setScheduleData(prev=>{ const u={...prev}; u[consultor]=(u[consultor]||[]).filter(e=>e.id!==entryId); return u; });
    showToast("🗑 Entrada removida","#ef4444");
  };

  // Cadastros handlers
  const handleSaveEmailConfig = (cfg) => {
    setEmailConfig(cfg);
    saveToFirestore("emailConfig", cfg);
    showToast("✅ Configuração de e-mail salva!", "#22c55e");
  };

  const handleAddConsultor = (consultor) => {
    if (scheduleData[consultor.name]) { showToast("Consultor já existe","#ef4444"); return; }
    setScheduleData(prev=>({...prev,[consultor.name]:[]}));
    window.__consultoresMeta = [...(window.__consultoresMeta||[]).filter(c=>c.name!==consultor.name), consultor];
    saveToFirestore("consultores_meta", window.__consultoresMeta);
    showToast("👤 Consultor "+consultor.name+" cadastrado!");
  };
  const handleRemoveConsultor = (name) => {
    setScheduleData(prev=>{ const u={...prev}; delete u[name]; return u; });
    window.__consultoresMeta = (window.__consultoresMeta||[]).filter(c=>c.name!==name);
    saveToFirestore("consultores_meta", window.__consultoresMeta);
    showToast("🗑 Consultor removido","#ef4444");
  };
  const handleUpdateConsultor = (oldName, updated) => {
    // atualiza metadados
    window.__consultoresMeta = [...(window.__consultoresMeta||[]).filter(c=>c.name!==oldName), updated];
    saveToFirestore("consultores_meta", window.__consultoresMeta);
    // se o nome mudou, renomear no scheduleData
    if (oldName !== updated.name) {
      setScheduleData(prev=>{ const u={...prev}; u[updated.name]=u[oldName]||[]; delete u[oldName]; return u; });
    }
    showToast("✅ Consultor atualizado!");
  };
  const handleAddClient = (client) => {
    if (clientList.find(c=>c.name===client.name)) { showToast("Cliente já existe","#ef4444"); return; }
    setClientList(prev=>[...prev,client]);
    showToast("🏢 Cliente "+client.name+" cadastrado!");
  };
  const handleRemoveClient = (name) => { setClientList(prev=>prev.filter(c=>c.name!==name)); showToast("🗑 Cliente removido","#ef4444"); };
  const handleUpdateClient = (oldName, updated) => {
    setClientList(prev=>prev.map(c=>c.name===oldName?{...c,...updated}:c));
    showToast("✅ Cliente atualizado!");
  };
  const handleAddProject = (project) => { setProjects(prev=>[...prev,project]); showToast("📋 Projeto "+project.name+" cadastrado!"); };
  const handleRemoveProject = (idx) => { setProjects(prev=>prev.filter((_,i)=>i!==idx)); showToast("🗑 Projeto removido","#ef4444"); };
  const handleUpdateProject = (idx, updated) => {
    setProjects(prev=>prev.map((p,i)=>i===idx?{...p,...updated}:p));
    showToast("✅ Projeto atualizado!");
  };

  // ── Enviar notificação por e-mail (EmailJS) ──
  const sendAgendaEmail = async ({ action, consultor, client, month, year, days, horaInicio, horaFim, intervalo, atividades, criadoPor, nomeUsuario }) => {
    const cfg = emailConfig;
    if (!cfg.enabled) {
      showToast("⚠️ Envio de e-mail está desativado. Configure em Cadastros → E-mail","#f59e0b");
      return;
    }
    if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
      showToast("⚠️ Configure as credenciais do e-mail em Cadastros → E-mail","#f59e0b");
      return;
    }

    // Carregar EmailJS do CDN se ainda não estiver
    const loadEJ = () => new Promise((resolve, reject) => {
      if (window.emailjs) { window.emailjs.init({ publicKey: cfg.publicKey }); resolve(window.emailjs); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.onload = () => { window.emailjs.init({ publicKey: cfg.publicKey }); resolve(window.emailjs); };
      s.onerror = reject;
      document.head.appendChild(s);
    });

    // Encontrar usuário pelo nome do consultor, nome ou e-mail
    const findUser = (nameOrEmail) => {
      if (!nameOrEmail) return null;
      return usuarios.find(u =>
        u.consultorName === nameOrEmail || u.nome === nameOrEmail || u.email === nameOrEmail
      ) || null;
    };

    const mesAno = `${month} ${year}`;
    const diasStr = (days||[]).join(', ');
    const acao = action === 'nova' ? 'incluída' : 'alterada';
    const horarioTexto = [
      horaInicio, horaFim ? `→ ${horaFim}` : '', intervalo ? `(intervalo: ${intervalo}min)` : ''
    ].filter(Boolean).join(' ') || '—';

    // ── Compor assunto: "Agenda incluída: Dia 17 — VEDACIT (Março 2026)"
    const diaLabel = days && days.length === 1 ? `Dia ${days[0]}` : `Dias ${diasStr}`;
    const assunto = `Agenda ${acao}: ${diaLabel} — ${client || '—'} (${mesAno})`;

    // ── Compor corpo HTML
    const rows = [
      ["Consultor", consultor],
      ["Cliente",   client || '—'],
      ["Data",      `${diaLabel} de ${mesAno}`],
      ["Horário",   horarioTexto],
      ...(atividades ? [["Atividades", atividades.replace(/\n/g,'<br>')]] : []),
      ["Agendado por", nomeUsuario],
    ];
    const tbody = rows.map(([k,v],i) =>
      `<tr style="background:${i%2===0?'#f0f0fa':'#ffffff'}"><td style="padding:10px 14px;font-weight:600;color:#6e6e88;width:130px;border-right:1px solid #c8c8d8">${k}</td><td style="padding:10px 14px;color:#18181f">${v}</td></tr>`
    ).join('');
    const corpo = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #c8c8d8;border-radius:10px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#1e3a5f,#0d0d14);padding:20px 24px">
    <h2 style="color:#f0f0fa;margin:0;font-size:18px">📅 Agenda de Consultores</h2>
    <p style="color:#6e6e88;margin:4px 0 0;font-size:13px">Notificação automática — agenda <strong style="color:#60a5fa">${acao}</strong></p>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${tbody}</table>
  <div style="padding:14px 24px;background:#f0f0fa;border-top:1px solid #c8c8d8">
    <p style="margin:0;font-size:11px;color:#6e6e88">Esta mensagem foi enviada automaticamente pelo sistema Agenda de Consultores.</p>
  </div>
</div>`.trim();

    // ── Montar destinatários
    const recipients = [];
    if (action === 'nova') {
      const cons = findUser(consultor);
      if (cons?.email) recipients.push({ email: cons.email, name: cons.nome || cons.consultorName || cons.email });
      if (currentUser.email && !recipients.find(r => r.email === currentUser.email))
        recipients.push({ email: currentUser.email, name: currentUser.nome || currentUser.email });
    } else {
      const cons = findUser(consultor);
      if (cons?.email) recipients.push({ email: cons.email, name: cons.nome || cons.consultorName || cons.email });
      if (criadoPor && criadoPor !== nomeUsuario) {
        const orig = findUser(criadoPor);
        if (orig?.email && !recipients.find(r => r.email === orig.email))
          recipients.push({ email: orig.email, name: orig.nome || orig.email });
      }
    }

    if (recipients.length === 0) {
      showToast("⚠️ Nenhum e-mail encontrado para notificar. Verifique o cadastro de usuários.","#f59e0b");
      return;
    }

    try {
      const ej = await loadEJ();
      for (const r of recipients) {
        await ej.send(cfg.serviceId, cfg.templateId, { assunto, corpo, to_name: r.name, to_email: r.email, acao, consultor, cliente: client||'—', mes_ano: mesAno, dias: diasStr, horario: horarioTexto, atividades: atividades||'—', realizado_por: nomeUsuario });
      }
      showToast(`📧 E-mail enviado para ${recipients.length} destinatário(s)`, "#3b82f6");
    } catch(e) {
      console.error("EmailJS error:", e);
      showToast("❌ Falha ao enviar e-mail: " + (e?.text || e?.message || "erro desconhecido"), "#ef4444");
    }
  };

  // ── Exportar para Excel ──
  const handleExportExcel = () => {
    const loadXLSX = () => new Promise(resolve => {
      if (window.XLSX) { resolve(window.XLSX); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = () => resolve(window.XLSX);
      document.head.appendChild(s);
    });

    const TYPE_PT = { client:"Cliente", vacation:"Férias", holiday:"Feriado", reserved:"Reservado", blocked:"Bloqueado" };
    const fmtDate = v => v ? new Date(v).toLocaleString('pt-BR') : '';

    loadXLSX().then(XLSX => {
      // Build flat rows
      const rows = [];
      for (const [consultor, entries] of Object.entries(scheduleData)) {
        for (const e of (entries||[])) {
          rows.push({
            Consultor: consultor,
            Mês: e.month || '',
            Ano: e.year || '',
            Dia: e.day || '',
            Cliente: e.client || '',
            Tipo: TYPE_PT[e.type] || e.type || '',
            'Hora Início': e.horaInicio || '',
            'Hora Fim': e.horaFim || '',
            'Intervalo (min)': e.intervalo || '',
            Atividades: e.atividades || '',
            'Criado Por': e.criadoPor || '',
            'Criado Em': fmtDate(e.criadoEm),
            'Alterado Por': e.alteradoPor || '',
            'Alterado Em': fmtDate(e.alteradoEm),
          });
        }
      }

      const sortRows = (a, b, primaryKey) => {
        if (a[primaryKey] !== b[primaryKey]) return a[primaryKey].localeCompare(b[primaryKey]);
        const ma = MONTHS_ORDER.indexOf(a.Mês), mb = MONTHS_ORDER.indexOf(b.Mês);
        if (ma !== mb) return ma - mb;
        if ((a.Ano||0) !== (b.Ano||0)) return (a.Ano||0) - (b.Ano||0);
        return (a.Dia||0) - (b.Dia||0);
      };

      const byConsultor = [...rows].sort((a,b)=>sortRows(a,b,'Consultor'));
      const byCliente   = [...rows].sort((a,b)=>sortRows(a,b,'Cliente'));

      // Resumo: consultor × cliente → count
      const resumoMap = {};
      rows.forEach(r => {
        if (!resumoMap[r.Consultor]) resumoMap[r.Consultor] = {};
        resumoMap[r.Consultor][r.Cliente] = (resumoMap[r.Consultor][r.Cliente]||0) + 1;
      });
      const allClients = [...new Set(rows.map(r=>r.Cliente))].sort();
      const resumoRows = Object.entries(resumoMap).sort(([a],[b])=>a.localeCompare(b)).map(([cons,clients])=>{
        const row = { Consultor: cons };
        allClients.forEach(c => { row[c] = clients[c] || 0; });
        row['Total'] = Object.values(clients).reduce((s,v)=>s+v,0);
        return row;
      });

      const wb = XLSX.utils.book_new();

      const makeSheet = (data) => {
        const ws = XLSX.utils.json_to_sheet(data);
        // Auto column widths
        const cols = Object.keys(data[0]||{});
        ws['!cols'] = cols.map(k => ({
          wch: Math.max(k.length, ...data.map(r=>String(r[k]||'').length), 10)
        }));
        // Freeze header row
        ws['!freeze'] = { xSplit:0, ySplit:1 };
        return ws;
      };

      XLSX.utils.book_append_sheet(wb, makeSheet(byConsultor), 'Por Consultor');
      XLSX.utils.book_append_sheet(wb, makeSheet(byCliente),   'Por Cliente');
      if (resumoRows.length > 0)
        XLSX.utils.book_append_sheet(wb, makeSheet(resumoRows), 'Resumo');

      const date = new Date().toISOString().slice(0,10);
      XLSX.writeFile(wb, `Agenda_Consultores_${date}.xlsx`);
      showToast('📊 Planilha exportada!', '#22c55e');
    }).catch(()=>showToast('Erro ao exportar planilha','#ef4444'));
  };

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
    entries.forEach(e=>{
      if (!byDay[e.day]) byDay[e.day]=[];
      byDay[e.day].push(e);
    });
    return byDay;
  },[selectedConsultor,selectedMonth,filteredData]);

  // ── Dados da semana global (view semanal) ──
  const weeklyData = useMemo(()=>{
    const today = new Date();
    // Segunda-feira da semana atual + offset
    const dow = (today.getDay()+6)%7; // 0=seg
    const monday = new Date(today); monday.setDate(today.getDate() - dow + selectedWeekOffset*7);
    monday.setHours(0,0,0,0);
    const days = Array.from({length:7},(_,i)=>{ const d=new Date(monday); d.setDate(monday.getDate()+i); return d; });
    const WD = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
    const result = { days, consultores: [] };
    const consultoresList = isConsultor ? [currentUser.consultorName] : consultores;
    for (const name of consultoresList) {
      const entries = (scheduleData[name]||[]);
      const row = { name, cells: days.map(d=>{
        const mName = MONTHS_ORDER[d.getMonth()];
        const dayNum = d.getDate();
        const yr = d.getFullYear();
        return entries.filter(e => {
          const em = e.month ? e.month.charAt(0).toUpperCase()+e.month.slice(1).toLowerCase() : "";
          const mn = mName.charAt(0).toUpperCase()+mName.slice(1).toLowerCase();
          return em===mn && e.day===dayNum && (e.year===yr || !e.year);
        });
      })};
      result.consultores.push(row);
    }
    return { ...result, monday };
  },[selectedWeekOffset, scheduleData, consultores, isConsultor, currentUser]);

  const VIEWS = canManage
    ? ["grid","calendario","semanal","timeline","stats","cadastros"]
    : ["grid","calendario","semanal","timeline","stats"];
  const VIEW_LABELS = { grid:"🗓 Grade", calendario:"📆 Calendário", semanal:"📅 Semanal", timeline:"📊 Timeline", stats:"📈 Stats", cadastros:"🗂 Cadastros", grade:"🎓 Grade de Conhecimento" };

  const badge = ROLE_BADGES[currentUser.role];

  // Tela de carregamento enquanto busca dados do Firestore
  if (!dbLoaded) return (
    <div style={{ fontFamily:"'Outfit',sans-serif", background:"#09090f", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&family=Cabinet+Grotesk:wght@900&display=swap" rel="stylesheet"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{ width:"54px",height:"54px",borderRadius:"16px",background:"linear-gradient(135deg,#6c63ff,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",boxShadow:"0 0 40px #6c63ff55" }}>◈</div>
      <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:"20px", fontWeight:900, color:"#f0f0fa", letterSpacing:"-0.5px" }}>Agenda de Consultores</div>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", color:"#3e3e55", fontSize:"13px" }}>
        <div style={{ width:"16px", height:"16px", border:"2px solid #1f1f2e", borderTop:"2px solid #6c63ff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
        Carregando dados...
      </div>
    </div>
  );

  // Todos os módulos disponíveis por perfil (fonte única de verdade)
  const ALL_MODULES_ADMIN = [
    { id:"home",     icon:"⬡",  label:"Dashboard",            desc:"Visão geral do sistema" },
    { id:"agenda",   icon:"📅", label:"Agenda",                desc:"Agenda de consultores" },
    { id:"viagens",  icon:"✈️",  label:"Viagens",              desc:"Solicitações de viagem" },
    { id:"projetos", icon:"📋", label:"Projetos",              desc:"Gestão de projetos" },
  ];
  const ALL_MODULES_CONSULTOR = [
    { id:"agenda",   icon:"📅", label:"Agenda",                desc:"Minha agenda" },
    { id:"grade",    icon:"🎓", label:"Grade de Conhecimento", desc:"Meus conhecimentos" },
    { id:"viagens",  icon:"✈️",  label:"Viagens",              desc:"Minhas viagens" },
  ];

  // Módulos habilitados para este usuário (vem do perfil salvo no Firestore)
  // Por padrão: todos habilitados
  const modulosHabilitados = currentUser.modulosHabilitados || null; // null = todos

  const MODULES_ADMIN    = ALL_MODULES_ADMIN.filter(m    => !modulosHabilitados || modulosHabilitados.includes(m.id));
  const MODULES_CONSULTOR= ALL_MODULES_CONSULTOR.filter(m=> !modulosHabilitados || modulosHabilitados.includes(m.id));
  const MODULES = isConsultor ? MODULES_CONSULTOR : MODULES_ADMIN;

  const SIDEBAR_W     = sidebarCollapsed ? 60 : 220;
  const SIDEBAR_TRANS = "width .22s cubic-bezier(.4,0,.2,1)";

  return (
    <div style={{ fontFamily:"'Outfit',sans-serif",background:T.bg,minHeight:"100vh",color:T.text,display:"flex",flexDirection:"row" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Cabinet+Grotesk:wght@700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${T.border2};border-radius:99px;}
        ::-webkit-scrollbar-thumb:hover{background:${T.accent};}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .nav-btn{transition:all .2s cubic-bezier(.4,0,.2,1);position:relative;}
        .nav-btn:hover{color:${T.heading}!important;}
        .nav-btn.active{background:${T.accent}!important;color:#fff!important;box-shadow:${T.accentGlow};}
        .action-btn{transition:all .2s cubic-bezier(.4,0,.2,1);}
        .action-btn:hover{filter:brightness(1.1);transform:translateY(-1px);}
        .card-hover{transition:box-shadow .25s,transform .25s,border-color .25s;}
        .card-hover:hover{box-shadow:${T.shadowLg};transform:translateY(-3px);border-color:${T.accent}44!important;}
        .side-item{transition:all .18s cubic-bezier(.4,0,.2,1);cursor:pointer;border-radius:10px;}
        .side-item:hover{background:${T.surfaceHover}!important;}
        input,select,textarea{outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit;}
        input:focus,select:focus,textarea:focus{border-color:${T.accent}!important;box-shadow:0 0 0 3px ${T.accent}20!important;}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width:SIDEBAR_W+"px",minHeight:"100vh",background:T.headerBg,borderRight:"1px solid "+T.headerBorder,display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,zIndex:100,flexShrink:0,transition:SIDEBAR_TRANS,overflow:"hidden" }}>
        {/* Logo + toggle */}
        <div style={{ padding:"14px 12px",borderBottom:"1px solid "+T.border,flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:"10px",minWidth:0 }}>
            <div style={{ width:"34px",height:"34px",borderRadius:"10px",background:`linear-gradient(135deg,${T.accent},${T.accentAlt})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",boxShadow:T.accentGlow,flexShrink:0 }}>◈</div>
            {!sidebarCollapsed && (
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"15px",fontWeight:900,color:T.heading,letterSpacing:"-0.5px",lineHeight:1 }}>GSC</div>
                <div style={{ fontSize:"9px",color:T.text3,fontWeight:600,letterSpacing:"1.5px",marginTop:"2px",textTransform:"uppercase" }}>Gestão de Serviços</div>
              </div>
            )}
            <button onClick={()=>setSidebarCollapsed(c=>!c)} title={sidebarCollapsed?"Expandir menu":"Recolher menu"}
              style={{ marginLeft:"auto",background:"transparent",border:"1px solid "+T.border,color:T.text3,borderRadius:"7px",width:"26px",height:"26px",cursor:"pointer",fontSize:"12px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s" }}>
              {sidebarCollapsed?"›":"‹"}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1,padding:"10px 8px",display:"flex",flexDirection:"column",gap:"2px",overflowY:"auto",overflowX:"hidden" }}>
          {!sidebarCollapsed && <div style={{ fontSize:"9px",color:T.text3,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",padding:"8px 8px 6px" }}>Módulos</div>}
          {MODULES.map(m=>{
            const active = activeModule===m.id;
            return (
              <div key={m.id} className="side-item" onClick={()=>setActiveModule(m.id)} title={sidebarCollapsed?m.label:""}
                style={{ padding:sidebarCollapsed?"10px":"10px 12px",display:"flex",alignItems:"center",gap:"10px",justifyContent:sidebarCollapsed?"center":"flex-start",background:active?`${T.accent}18`:"transparent",border:active?`1px solid ${T.accent}33`:"1px solid transparent",minWidth:0 }}>
                <span style={{ fontSize:"18px",lineHeight:1,flexShrink:0 }}>{m.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:"13px",fontWeight:active?700:500,color:active?T.accent:T.text,whiteSpace:"nowrap" }}>{m.label}</div>
                      <div style={{ fontSize:"10px",color:T.text3,marginTop:"1px",whiteSpace:"nowrap" }}>{m.desc}</div>
                    </div>
                    {active && <div style={{ marginLeft:"auto",width:"4px",height:"20px",borderRadius:"2px",background:T.accent,flexShrink:0 }}/>}
                  </>
                )}
              </div>
            );
          })}

          {canManage && (
            <>
              {!sidebarCollapsed && <div style={{ fontSize:"9px",color:T.text3,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",padding:"16px 8px 6px" }}>Administração</div>}
              {sidebarCollapsed && <div style={{ height:"10px" }}/>}
              <div className="side-item" onClick={()=>setActiveModule("cadastros")} title={sidebarCollapsed?"Cadastros":""}
                style={{ padding:sidebarCollapsed?"10px":"10px 12px",display:"flex",alignItems:"center",gap:"10px",justifyContent:sidebarCollapsed?"center":"flex-start",background:activeModule==="cadastros"?`${T.accent}18`:"transparent",border:activeModule==="cadastros"?`1px solid ${T.accent}33`:"1px solid transparent" }}>
                <span style={{ fontSize:"18px",lineHeight:1,flexShrink:0 }}>🗂</span>
                {!sidebarCollapsed && (
                  <>
                    <div>
                      <div style={{ fontSize:"13px",fontWeight:activeModule==="cadastros"?700:500,color:activeModule==="cadastros"?T.accent:T.text }}>Cadastros</div>
                      <div style={{ fontSize:"10px",color:T.text3,marginTop:"1px" }}>Dados do sistema</div>
                    </div>
                    {activeModule==="cadastros" && <div style={{ marginLeft:"auto",width:"4px",height:"20px",borderRadius:"2px",background:T.accent }}/>}
                  </>
                )}
              </div>
              <div className="side-item" onClick={()=>setShowUserMgmt(true)} title={sidebarCollapsed?"Usuários":""}
                style={{ padding:sidebarCollapsed?"10px":"10px 12px",display:"flex",alignItems:"center",gap:"10px",justifyContent:sidebarCollapsed?"center":"flex-start",background:"transparent",border:"1px solid transparent" }}>
                <span style={{ fontSize:"18px",lineHeight:1,flexShrink:0 }}>👥</span>
                {!sidebarCollapsed && (
                  <div>
                    <div style={{ fontSize:"13px",fontWeight:500,color:T.text }}>Usuários</div>
                    <div style={{ fontSize:"10px",color:T.text3,marginTop:"1px" }}>Gerenciar acessos</div>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* User footer */}
        <div style={{ padding:"12px",borderTop:"1px solid "+T.border,flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",justifyContent:sidebarCollapsed?"center":"flex-start" }}>
            <div style={{ width:"30px",height:"30px",borderRadius:"9px",background:`linear-gradient(135deg,${T.accent},${T.accentAlt})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:800,color:"#fff",flexShrink:0 }}>
              {getInitials(currentUser.consultorName||currentUser.username||"??")}
            </div>
            {!sidebarCollapsed && (
              <>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:"12px",fontWeight:700,color:T.heading,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{(currentUser.consultorName||currentUser.username||"").split(" ")[0]}</div>
                  <div style={{ fontSize:"9px",fontWeight:700,color:badge.color,marginTop:"2px",letterSpacing:"0.5px",textTransform:"uppercase" }}>{badge.label}</div>
                </div>
                <div style={{ display:"flex",gap:"4px",flexShrink:0 }}>
                  <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} title={isDark?"Tema claro":"Tema escuro"}
                    style={{ background:"transparent",border:"none",color:T.text3,cursor:"pointer",fontSize:"13px",padding:"4px",borderRadius:"6px" }}>{isDark?"☀️":"🌙"}</button>
                  <button onClick={onLogout} title="Sair"
                    style={{ background:"transparent",border:"none",color:T.text3,cursor:"pointer",fontSize:"13px",padding:"4px",borderRadius:"6px" }}>⎋</button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ marginLeft:SIDEBAR_W+"px",flex:1,display:"flex",flexDirection:"column",minHeight:"100vh",transition:SIDEBAR_TRANS }}>

        {/* Top bar */}
        <header style={{ background:T.headerBg,borderBottom:"1px solid "+T.headerBorder,padding:"0 28px",height:"56px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(12px)" }}>
          <div>
            <span style={{ fontSize:"16px",fontWeight:700,color:T.heading }}>
              {MODULES.concat([{id:"cadastros",label:"Cadastros"}]).find(m=>m.id===activeModule)?.label || ""}
            </span>
            {activeModule==="agenda" && <span style={{ fontSize:"11px",color:T.text3,marginLeft:"10px" }}>{consultores.length} consultores · {Object.values(scheduleData).flat().filter(e=>e.type==="client").length} dias agendados</span>}
          </div>
          <div style={{ display:"flex",gap:"8px",alignItems:"center" }}>
            {activeModule==="agenda" && canEdit && (
              <button onClick={()=>{setEditEntry(null);setShowModal(true);}} className="action-btn"
                style={{ padding:"7px 16px",borderRadius:"10px",border:"none",cursor:"pointer",fontWeight:700,fontSize:"12px",background:`linear-gradient(135deg,${T.accent},${T.accentAlt})`,color:"#fff",display:"flex",alignItems:"center",gap:"6px",boxShadow:T.accentGlow }}>
                <span style={{ fontSize:"15px",lineHeight:1 }}>+</span> Nova Agenda
              </button>
            )}
            {activeModule==="agenda" && canEdit && (
              <button onClick={handleExportExcel} className="action-btn" title="Exportar Excel"
                style={{ padding:"7px 12px",borderRadius:"10px",border:"1px solid "+T.border2,cursor:"pointer",fontSize:"13px",background:T.btnInactive,color:T.text2 }}>📊</button>
            )}
          </div>
        </header>

        {/* ── READONLY BANNER ── */}
        {(isViewer || isConsultor) && activeModule==="agenda" && (
          <div style={{ background:isDark?"#f5a62308":"#fffbeb",borderBottom:"1px solid "+(isDark?"#f5a62320":"#fcd34d"),padding:"6px 28px",display:"flex",alignItems:"center",gap:"8px" }}>
            <span style={{ fontSize:"11px" }}>🔒</span>
            <span style={{ fontSize:"11px",color:"#f5a623",fontWeight:600 }}>
              {isConsultor ? `Acesso restrito — visualizando apenas a agenda de ${currentUser.consultorName}.` : "Modo visualização — sem permissão para editar agendas."}
            </span>
          </div>
        )}

        {/* ── MODULE: HOME (Dashboard) ── */}
        {activeModule==="home" && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <div style={{ marginBottom:"28px" }}>
              <h1 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"24px",fontWeight:900,color:T.heading,letterSpacing:"-0.5px",margin:"0 0 6px" }}>
                Olá, {(currentUser.consultorName||currentUser.nome||currentUser.username||"").split(" ")[0]} 👋
              </h1>
              <p style={{ fontSize:"13px",color:T.text2,margin:0 }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</p>
            </div>

            {/* Cards de módulos */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"16px",marginBottom:"32px" }}>
              {[
                { id:"agenda",   icon:"📅", label:"Agenda de Consultores", desc:"Gerencie as agendas e cronogramas dos consultores",  color:"#6c63ff", stat:Object.values(scheduleData).flat().filter(e=>e.type==="client").length, statLabel:"dias agendados" },
                { id:"viagens",  icon:"✈️",  label:"Solicitações de Viagem",desc:"Controle pedidos de viagem, aprovações e reembolsos", color:"#22d3a0", stat:0, statLabel:"solicitações" },
                { id:"projetos", icon:"📋", label:"Gestão de Projetos",    desc:"Acompanhe projetos, tarefas e horas trabalhadas",    color:"#f5a623", stat:projects.length, statLabel:"projetos ativos" },
                ...(canManage?[{ id:"cadastros",icon:"🗂", label:"Cadastros", desc:"Consultores, clientes, projetos e configurações", color:"#a78bfa", stat:consultores.length, statLabel:"consultores" }]:[]),
              ].map(mod=>(
                <div key={mod.id} className="card-hover" onClick={()=>setActiveModule(mod.id)}
                  style={{ background:T.surface,borderRadius:"16px",border:"1px solid "+T.border,padding:"22px",cursor:"pointer",position:"relative",overflow:"hidden" }}>
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:"3px",background:`linear-gradient(90deg,${mod.color},${mod.color}88)` }}/>
                  <div style={{ fontSize:"28px",marginBottom:"14px" }}>{mod.icon}</div>
                  <div style={{ fontSize:"15px",fontWeight:700,color:T.heading,marginBottom:"6px" }}>{mod.label}</div>
                  <div style={{ fontSize:"12px",color:T.text2,lineHeight:1.5,marginBottom:"16px" }}>{mod.desc}</div>
                  <div style={{ display:"flex",alignItems:"baseline",gap:"5px" }}>
                    <span style={{ fontSize:"22px",fontWeight:800,color:mod.color }}>{mod.stat}</span>
                    <span style={{ fontSize:"11px",color:T.text3 }}>{mod.statLabel}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo rápido da semana */}
            <div style={{ background:T.surface,borderRadius:"16px",border:"1px solid "+T.border,padding:"20px" }}>
              <h3 style={{ fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"15px",fontWeight:700,color:T.heading,margin:"0 0 16px" }}>📅 Agenda desta semana</h3>
              <WeeklyGlobalView weeklyData={weeklyData} offset={selectedWeekOffset} setOffset={setSelectedWeekOffset} clientColorMap={clientColorMap} canEdit={false} onEdit={null} onNewEntry={null} theme={T}/>
            </div>
          </div>
        )}

        {/* ── MODULE: AGENDA ── */}
        {activeModule==="agenda" && (
          <div style={{ display:"flex",flexDirection:"column",flex:1 }}>
            {/* Filtros */}
            <div style={{ background:T.surface,padding:"10px 28px",display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center",borderBottom:"1px solid "+T.border }}>
              {!isConsultor && (
                <select value={selectedConsultor||""} onChange={e=>setSelectedConsultor(e.target.value||null)}
                  style={{ padding:"7px 12px",borderRadius:"10px",border:"1px solid "+T.inputBorder,background:T.inputBg,color:T.inputColor,fontSize:"12px",cursor:"pointer",minWidth:"168px",fontFamily:"inherit",fontWeight:500 }}>
                  <option value="">Todos os consultores</option>
                  {consultores.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {isConsultor && (
                <div style={{ display:"flex",alignItems:"center",gap:"8px",padding:"5px 12px 5px 8px",borderRadius:"99px",background:T.btnInactive,border:"1px solid "+T.border }}>
                  <div style={{ width:"22px",height:"22px",borderRadius:"50%",background:`linear-gradient(135deg,${T.accent},${T.accentAlt})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:800,color:"#fff" }}>{getInitials(currentUser.consultorName||"")}</div>
                  <span style={{ fontSize:"12px",fontWeight:600,color:T.heading }}>{currentUser.consultorName}</span>
                </div>
              )}
              <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}
                style={{ padding:"7px 12px",borderRadius:"10px",border:"1px solid "+T.inputBorder,background:T.inputBg,color:T.inputColor,fontSize:"12px",cursor:"pointer",fontFamily:"inherit",fontWeight:500 }}>
                {allMonths.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <div style={{ position:"relative",display:"flex",alignItems:"center" }}>
                <span style={{ position:"absolute",left:"10px",fontSize:"12px",color:T.text3,pointerEvents:"none" }}>🔍</span>
                <input placeholder="Buscar cliente..." value={searchClient} onChange={e=>setSearchClient(e.target.value)}
                  style={{ padding:"7px 12px 7px 30px",borderRadius:"10px",border:"1px solid "+T.inputBorder,background:T.inputBg,color:T.inputColor,fontSize:"12px",minWidth:"160px",fontFamily:"inherit" }}/>
              </div>
              {selectedConsultor && (
                <div style={{ display:"flex",gap:"2px",background:T.btnInactive,borderRadius:"10px",padding:"2px",border:"1px solid "+T.border }}>
                  {[["semanal","📅 Semanal"],["mensal","🗓 Mensal"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setConsultorViewMode(v)} className="nav-btn"
                      style={{ padding:"5px 14px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"11px",background:consultorViewMode===v?T.accent:"transparent",color:consultorViewMode===v?"#fff":T.text2 }}>{l}</button>
                  ))}
                </div>
              )}
              {/* View tabs */}
              <div style={{ marginLeft:"auto",display:"flex",gap:"2px",background:T.btnInactive,borderRadius:"10px",padding:"2px",border:"1px solid "+T.border }}>
                {VIEWS.map(v=>(
                  <button key={v} onClick={()=>setView(v)} className={"nav-btn"+(view===v?" active":"")}
                    style={{ padding:"5px 12px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:600,fontSize:"11px",background:view===v?T.accent:"transparent",color:view===v?"#fff":T.text2,whiteSpace:"nowrap" }}>
                    {VIEW_LABELS[v]}
                  </button>
                ))}
              </div>
            </div>

            {/* Content area */}
            <div style={{ padding:"24px 28px",flex:1 }}>
              {view==="grid" && (
                selectedConsultor
                  ? consultorViewMode==="semanal"
                    ? selectedMonth!=="Todos"&&calendarData
                      ? <CalendarView consultant={selectedConsultor} month={selectedMonth} byDay={calendarData}/>
                      : <div style={{ textAlign:"center",padding:"60px 20px",color:T.text2,fontSize:"14px" }}><div style={{ fontSize:"36px",marginBottom:"12px" }}>📅</div>Selecione um mês específico para ver a visualização semanal</div>
                    : <CalendarioMensal data={{[selectedConsultor]: scheduleData[selectedConsultor]||[]}} selectedMonth={selectedMonth} allMonths={allMonths} consultores={[selectedConsultor]} clientColors={clientColorMap} readonly={!canEdit} onEdit={canEdit?(entry)=>{setEditEntry(entry);setShowModal(true);}:null} onDelete={canEdit?handleDeleteEntry:null} onNewEntry={canEdit?({consultor,month,day})=>{ setEditEntry({consultor,month,day,prefill:true}); setShowModal(true); }:null}/>
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
                    : <div style={{ textAlign:"center",padding:"60px 20px",color:T.text2,fontSize:"14px" }}><div style={{ fontSize:"36px",marginBottom:"12px" }}>📅</div>Selecione um mês específico para ver a visualização semanal</div>
                  : <CalendarioMensal data={filteredData} selectedMonth={selectedMonth} allMonths={allMonths} consultores={isConsultor?[currentUser.consultorName]:consultores} clientColors={clientColorMap} readonly={!canEdit} onEdit={canEdit?(entry)=>{setEditEntry(entry);setShowModal(true);}:null} onDelete={canEdit?handleDeleteEntry:null} onNewEntry={canEdit?({consultor,month,day})=>{ setEditEntry({consultor,month,day,prefill:true}); setShowModal(true); }:null}/>
              )}
              {view==="semanal" && <WeeklyGlobalView weeklyData={weeklyData} offset={selectedWeekOffset} setOffset={setSelectedWeekOffset} clientColorMap={clientColorMap} canEdit={canEdit} onEdit={(entry,name)=>{setEditEntry({...entry,consultor:name});setShowModal(true);}} onNewEntry={canEdit?({consultor,month,day,year})=>{setEditEntry({consultor,month,day,year,prefill:true});setShowModal(true);}:null} theme={T}/>}
              {view==="timeline" && <TimelineView data={filteredData} months={allMonths.filter(m=>m!=="Todos")}/>}
              {view==="stats" && <StatsView stats={stats}/>}
            </div>
          </div>
        )}

        {/* ── MODULE: GRADE (consultor) ── */}
        {activeModule==="grade" && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <GradeConhecimento consultorName={currentUser.consultorName||currentUser.nome||currentUser.username||""} userId={currentUser.uid} readOnly={false}/>
          </div>
        )}

        {/* ── MODULE: VIAGENS ── */}
        {activeModule==="viagens" && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <ModuloViagens currentUser={currentUser} canEdit={canEdit} canManage={canManage} consultores={consultores} theme={T}/>
          </div>
        )}

        {/* ── MODULE: PROJETOS ── */}
        {activeModule==="projetos" && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <ModuloProjetos currentUser={currentUser} canEdit={canEdit} canManage={canManage} consultores={consultores} clients={clientList} theme={T}/>
          </div>
        )}

        {/* ── MODULE: CADASTROS ── */}
        {activeModule==="cadastros" && canManage && (
          <div style={{ padding:"28px 32px",flex:1 }}>
            <CadastrosView
              consultores={consultores} clients={clientList} projects={projects}
              onAddConsultor={handleAddConsultor} onRemoveConsultor={handleRemoveConsultor} onUpdateConsultor={handleUpdateConsultor}
              onAddClient={handleAddClient} onRemoveClient={handleRemoveClient} onUpdateClient={handleUpdateClient}
              onAddProject={handleAddProject} onRemoveProject={handleRemoveProject} onUpdateProject={handleUpdateProject}
              emailConfig={emailConfig} onSaveEmailConfig={handleSaveEmailConfig}
            />
          </div>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position:"fixed",bottom:"24px",right:"24px",background:isDark?"#18181f":"#ffffff",color:T.heading,padding:"12px 18px",borderRadius:"14px",fontWeight:600,fontSize:"13px",zIndex:9999,boxShadow:"0 8px 40px rgba(0,0,0,0.5)",animation:"fadeUp .25s cubic-bezier(.4,0,.2,1)",display:"flex",alignItems:"center",gap:"10px",maxWidth:"360px",border:"1px solid "+(isDark?"#2a2a3a":"#e4e4ea"),borderLeft:"3px solid "+(toast.color||"#6c63ff") }}>
          <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:toast.color||"#6c63ff",flexShrink:0 }}/>{toast.msg}
        </div>
      )}

      {/* MODAL */}
      {showModal && canEdit && (
        <AgendaModal consultores={consultores} clients={clientList.map(c=>c.name)} months={MONTHS_ORDER} editEntry={editEntry} onSave={handleSaveEntry} onClose={()=>{setShowModal(false);setEditEntry(null);}}/>
      )}

      {showUserMgmt && (
        <GerenciarUsuarios consultores={consultores} onAddConsultor={handleAddConsultor} onClose={()=>setShowUserMgmt(false)}/>
      )}
    </div>
  );
}
