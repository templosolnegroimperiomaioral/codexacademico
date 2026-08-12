import "dotenv/config";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL deve ser definida para executar a seed.");
if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEVELOPMENT_SEED !== "true") {
  throw new Error("A seed de desenvolvimento é bloqueada em produção. Defina ALLOW_DEVELOPMENT_SEED=true somente se tiver certeza.");
}

const connection = await mysql.createConnection(databaseUrl);

async function findOrCreateSemester(userId: number) {
  const [existing] = await connection.execute<mysql.RowDataPacket[]>("SELECT id FROM semesters WHERE userId = ? AND name = ? LIMIT 1", [userId, "2026.2"]);
  if (existing[0]?.id) return Number(existing[0].id);
  const [created] = await connection.execute<mysql.ResultSetHeader>("INSERT INTO semesters (userId, name, isCurrent) VALUES (?, ?, ?)", [userId, "2026.2", true]);
  return created.insertId;
}

async function findOrCreateSubject(userId: number, semesterId: number, subject: { name: string; professor: string; room: string; color: string; scheduleNote: string }) {
  const [existing] = await connection.execute<mysql.RowDataPacket[]>("SELECT id FROM subjects WHERE userId = ? AND name = ? LIMIT 1", [userId, subject.name]);
  if (existing[0]?.id) return Number(existing[0].id);
  const [created] = await connection.execute<mysql.ResultSetHeader>("INSERT INTO subjects (userId, semesterId, name, professor, room, color, scheduleNote) VALUES (?, ?, ?, ?, ?, ?, ?)", [userId, semesterId, subject.name, subject.professor, subject.room, subject.color, subject.scheduleNote]);
  return created.insertId;
}

try {
  const [userResult] = await connection.execute<mysql.ResultSetHeader>(
    "INSERT INTO users (openId, name, email, loginMethod) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), id = LAST_INSERT_ID(id)",
    ["seed:estudante", "Estudante Codex", "estudante@example.test", "seed"],
  );
  const userId = userResult.insertId || Number((await connection.execute<mysql.RowDataPacket[]>("SELECT id FROM users WHERE openId = ?", ["seed:estudante"]))[0][0].id);
  const semesterId = await findOrCreateSemester(userId);
  const constitutionalId = await findOrCreateSubject(userId, semesterId, { name: "Direito Constitucional II", professor: "Prof. Adriano Sant'Ana", room: "Sala 202", color: "#C9A66B", scheduleNote: "Terças e quintas · 08h" });
  const civilId = await findOrCreateSubject(userId, semesterId, { name: "Direito Civil III", professor: "Prof. Gustavo Tepedino", room: "Sala 203", color: "#809DC2", scheduleNote: "Terças e quintas · 10h" });
  const startsAt = Date.now() + 86_400_000;
  const [events] = await connection.execute<mysql.RowDataPacket[]>("SELECT id FROM academicEvents WHERE userId = ? AND title = ? AND startsAt = ? LIMIT 1", [userId, "Aula de Direito Constitucional II", startsAt]);
  if (!events[0]) await connection.execute("INSERT INTO academicEvents (userId, subjectId, type, title, location, startsAt, source) VALUES (?, ?, ?, ?, ?, ?, ?)", [userId, constitutionalId, "class", "Aula de Direito Constitucional II", "Sala 202", startsAt, "manual"]);
  const [tasks] = await connection.execute<mysql.RowDataPacket[]>("SELECT id FROM studyTasks WHERE userId = ? AND title = ? LIMIT 1", [userId, "Ler ADI 4277"]);
  if (!tasks[0]) await connection.execute("INSERT INTO studyTasks (userId, subjectId, title, dueAt, isCompleted, source) VALUES (?, ?, ?, ?, ?, ?)", [userId, constitutionalId, "Ler ADI 4277", startsAt, false, "manual"]);
  const [notifications] = await connection.execute<mysql.RowDataPacket[]>("SELECT id FROM academicNotifications WHERE userId = ? AND externalId = ? LIMIT 1", [userId, "seed-classroom-material"]);
  if (!notifications[0]) await connection.execute("INSERT INTO academicNotifications (userId, subjectId, source, externalId, title, summary, receivedAt, reviewStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [userId, civilId, "classroom", "seed-classroom-material", "Professor publicou material", "Material de leitura disponível para a próxima aula.", Date.now(), "pending"]);
  console.log("Seed concluída: período, disciplinas, aula, tarefa e aviso acadêmico disponíveis para teste.");
} finally {
  await connection.end();
}
