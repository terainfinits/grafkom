/**
 * Progress — seluruh status permainan di satu tempat: tiket, ruang yang sudah
 * dikunjungi, dan (nanti) koleksi yang sudah diperiksa & kuis yang sudah dijawab.
 * Daftar quest dihitung dari status ini, jadi tidak ada data ganda yang bisa tidak sinkron.
 *
 * Status quest:
 *   done    — selesai
 *   active  — quest pertama yang belum selesai (yang sedang dikejar)
 *   pending — belum selesai, menunggu giliran
 *   locked  — fiturnya belum ada (koleksi), ditampilkan terkunci
 *
 * Kunjungan dianggap SELESAI (allDone) bila semua ruang sudah dikunjungi dan semua koleksi
 * sudah diperiksa. Kuis bersifat opsional: tidak ikut syarat selesai, dan selama fiturnya
 * belum ada (quizAvailable = false) tidak dimunculkan di daftar quest sama sekali.
 *
 * Pemakaian:
 *   const progress = new Progress({ roomCount: 8 });
 *   progress.onChange(({ active, activeChanged, justCompleted, justFoundAllSecondary, justUnlockedSecret }) => { ... });
 *   progress.start(); // mulai menghitung lama kunjungan (setelah layar loading hilang)
 *   progress.buyTicket();
 *   const firstTime = progress.visitRoom('wastra');
 */
export class Progress {
  constructor({ roomCount, artifactCount = 0, quizCount = 4, quizAvailable = false, secondaryCount = 0 }) {
    this.roomCount = roomCount;
    this.artifactCount = artifactCount; // 0 = koleksi belum dipasang → quest terkunci
    this.quizCount = quizCount;
    this.quizAvailable = quizAvailable;

    this.hasTicket = false;
    this.visited = new Set();
    this.inspected = new Set();
    this.quizzesDone = new Set();
    this.quizScores = new Map(); // id artefak → skor kuis (ui/mapQuiz.js)

    // Koleksi pendukung (lukisan): progres opsional, tidak ikut syarat selesai. Semua dilihat
    // → achievement, diumumkan sekali lewat onChange (justFoundAllSecondary).
    this.secondaryCount = secondaryCount;
    this.secondarySeen = new Set();
    this.secondaryDone = false;
    this.secretUnlocked = false; // easter egg (everythingDone), diumumkan sekali: justUnlockedSecret

    // Lama kunjungan: dihitung dari start() sampai selesai (waktu dibekukan saat allDone)
    this.startedAt = null;
    this.finishedAt = null;

    this._listeners = [];
    this._activeId = this.activeQuest?.id ?? null;
  }

  start() {
    this.startedAt = performance.now();
  }

  // Semua quest — koleksi utama, kuis (opsional), & lukisan (opsional) — selesai → easter egg
  get everythingDone() {
    return this.allDone && this.secondaryDone
      && (!this.quizAvailable || this.quizzesDone.size >= this.quizCount);
  }

  get allDone() {
    return this.visited.size >= this.roomCount
      && this.artifactCount > 0 && this.inspected.size >= this.artifactCount;
  }

  // Lama kunjungan dalam milidetik (berhenti bertambah setelah selesai)
  get elapsedMs() {
    if (this.startedAt === null) return 0;
    return (this.finishedAt ?? performance.now()) - this.startedAt;
  }

  onChange(fn) {
    this._listeners.push(fn);
  }

  buyTicket() {
    if (this.hasTicket) return;
    this.hasTicket = true;
    this._emit();
  }

  // Mengembalikan true kalau ruang ini baru pertama kali dikunjungi
  visitRoom(id) {
    if (this.visited.has(id)) return false;
    this.visited.add(id);
    this._emit();
    return true;
  }

  // Mengembalikan true kalau artefak ini baru pertama kali tercatat diperiksa
  inspectArtifact(id) {
    if (this.inspected.has(id)) return false;
    this.inspected.add(id);
    this._emit();
    return true;
  }

  // Mode developer: tandai banyak ruang, koleksi, kuis, & lukisan sekaligus, lalu umumkan SEKALI
  // (memanggil visitRoom/inspectArtifact satu per satu akan memunculkan toast quest berkali-kali)
  //   quizzes   : [[id, skor], ...] kuis yang dianggap sudah dijawab
  //   secondary : id koleksi pendukung (lukisan) yang dianggap sudah dilihat
  devComplete({ rooms = [], artifacts = [], quizzes = [], secondary = [] }) {
    this.hasTicket = true;
    for (const id of rooms) this.visited.add(id);
    for (const id of artifacts) this.inspected.add(id);
    for (const [id, score] of quizzes) {
      this.quizzesDone.add(id);
      this.quizScores.set(id, score);
    }
    for (const id of secondary) this.secondarySeen.add(id);
    this._emit();
  }

  // Mengembalikan true kalau koleksi pendukung ini baru pertama kali dilihat
  viewSecondary(id) {
    if (this.secondarySeen.has(id)) return false;
    this.secondarySeen.add(id);
    this._emit();
    return true;
  }

  // Kuis tebak asal: dicatat sekali per artefak (kuis tidak diulang setelah dijawab)
  answerQuiz(id, score) {
    if (this.quizzesDone.has(id)) return;
    this.quizzesDone.add(id);
    this.quizScores.set(id, score);
    this._emit();
  }

  get quizScore() {
    let total = 0;
    for (const s of this.quizScores.values()) total += s;
    return total;
  }

  get quests() {
    const list = [
      { id: 'tiket', label: 'Beli tiket di loket', done: this.hasTicket },
      { id: 'masuk', label: 'Masuki museum', done: this.visited.size > 0 },
      { id: 'ruang', label: 'Jelajahi semua ruang',
        count: this.visited.size, total: this.roomCount, done: this.visited.size >= this.roomCount },
      { id: 'koleksi', label: 'Periksa koleksi', available: this.artifactCount > 0,
        count: this.inspected.size, total: this.artifactCount,
        done: this.artifactCount > 0 && this.inspected.size >= this.artifactCount },
    ];
    // Kuis opsional: baru ditampilkan kalau fiturnya sudah ada
    if (this.quizAvailable) {
      list.push({ id: 'kuis', label: 'Ikuti kuis tebak asal koleksi', optional: true,
        count: this.quizzesDone.size, total: this.quizCount,
        done: this.quizzesDone.size >= this.quizCount });
    }
    if (this.secondaryCount > 0) {
      list.push({ id: 'lukisan', label: 'Temukan semua lukisan', optional: true,
        count: this.secondarySeen.size, total: this.secondaryCount,
        done: this.secondarySeen.size >= this.secondaryCount });
    }
    let activeFound = false;
    for (const q of list) {
      if (q.done) q.status = 'done';
      else if (q.available === false) q.status = 'locked';
      else if (!activeFound) { q.status = 'active'; activeFound = true; }
      else q.status = 'pending';
    }
    return list;
  }

  get activeQuest() {
    return this.quests.find((q) => q.status === 'active') ?? null;
  }

  _emit() {
    const active = this.activeQuest;
    const activeChanged = (active?.id ?? null) !== this._activeId;
    this._activeId = active?.id ?? null;
    // justCompleted hanya true SEKALI, tepat saat syarat selesai pertama kali terpenuhi
    const justCompleted = this.finishedAt === null && this.allDone;
    if (justCompleted) this.finishedAt = performance.now();
    const justFoundAllSecondary = !this.secondaryDone && this.secondaryCount > 0
      && this.secondarySeen.size >= this.secondaryCount;
    if (justFoundAllSecondary) this.secondaryDone = true;
    const justUnlockedSecret = !this.secretUnlocked && this.everythingDone;
    if (justUnlockedSecret) this.secretUnlocked = true;
    for (const fn of this._listeners) fn({ active, activeChanged, justCompleted, justFoundAllSecondary, justUnlockedSecret });
  }
}
