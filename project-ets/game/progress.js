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
 *   progress.onChange(({ active, activeChanged, justCompleted }) => { ... });
 *   progress.start(); // mulai menghitung lama kunjungan (setelah layar loading hilang)
 *   progress.buyTicket();
 *   const firstTime = progress.visitRoom('wastra');
 */
export class Progress {
  constructor({ roomCount, artifactCount = 0, quizCount = 4, quizAvailable = false }) {
    this.roomCount = roomCount;
    this.artifactCount = artifactCount; // 0 = koleksi belum dipasang → quest terkunci
    this.quizCount = quizCount;
    this.quizAvailable = quizAvailable;

    this.hasTicket = false;
    this.visited = new Set();
    this.inspected = new Set();
    this.quizzesDone = new Set();

    // Lama kunjungan: dihitung dari start() sampai selesai (waktu dibekukan saat allDone)
    this.startedAt = null;
    this.finishedAt = null;

    this._listeners = [];
    this._activeId = this.activeQuest?.id ?? null;
  }

  start() {
    this.startedAt = performance.now();
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
    for (const fn of this._listeners) fn({ active, activeChanged, justCompleted });
  }
}
