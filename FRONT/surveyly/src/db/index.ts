import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Survey, SurveyResponse, BackupMeta, Owner } from '../types';

interface SurveyDB extends DBSchema {
  surveys: {
    key: string;
    value: Survey;
  };
  responses: {
    key: string;
    value: SurveyResponse;
    indexes: { 'by-survey': string };
  };
  backup_meta: {
    key: string;
    value: BackupMeta;
  };
  owner: {
    key: string;
    value: Owner;
  };
}

let db: IDBPDatabase<SurveyDB>;

export async function getDB() {
  if (db) return db;

  db = await openDB<SurveyDB>('surveyly-db', 1, {
    upgrade(db) {
      // Surveys store
      db.createObjectStore('surveys', { keyPath: 'id' });

      // Responses store with index to query by surveyId
      const responseStore = db.createObjectStore('responses', { keyPath: 'id' });
      responseStore.createIndex('by-survey', 'surveyId');

      // Backup metadata (single record keyed as 'meta')
      db.createObjectStore('backup_meta');

      // Owner (single record keyed as 'owner')
      db.createObjectStore('owner');
    },
  });

  return db;
}

// ── Surveys ────────────────────────────────────────────────
export async function getAllSurveys(): Promise<Survey[]> {
  const db = await getDB();
  return db.getAll('surveys');
}

export async function getSurvey(id: string): Promise<Survey | undefined> {
  const db = await getDB();
  return db.get('surveys', id);
}

export async function saveSurvey(survey: Survey): Promise<void> {
  const db = await getDB();
  await db.put('surveys', survey);
}

export async function deleteSurvey(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('surveys', id);
}

// ── Responses ──────────────────────────────────────────────
export async function getResponsesBySurvey(surveyId: string): Promise<SurveyResponse[]> {
  const db = await getDB();
  return db.getAllFromIndex('responses', 'by-survey', surveyId);
}

export async function saveResponse(response: SurveyResponse): Promise<void> {
  const db = await getDB();
  await db.put('responses', response);
}

export async function markResponseSynced(id: string): Promise<void> {
  const db = await getDB();
  const response = await db.get('responses', id);
  if (response) {
    response.synced = true;
    await db.put('responses', response);
  }
}

// ── Backup meta ────────────────────────────────────────────
export async function getBackupMeta(): Promise<BackupMeta | undefined> {
  const db = await getDB();
  return db.get('backup_meta', 'meta');
}

export async function saveBackupMeta(meta: BackupMeta): Promise<void> {
  const db = await getDB();
  await db.put('backup_meta', meta, 'meta');
}

// ── Owner ──────────────────────────────────────────────────
export async function getOwner(): Promise<Owner | undefined> {
  const db = await getDB();
  return db.get('owner', 'owner');
}

export async function saveOwner(owner: Owner): Promise<void> {
  const db = await getDB();
  await db.put('owner', owner, 'owner');
}

export async function clearOwner(): Promise<void> {
  const db = await getDB();
  await db.delete('owner', 'owner');
}