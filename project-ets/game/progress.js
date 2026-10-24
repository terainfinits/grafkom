/**
 * Progress — seluruh status permainan di satu tempat: tiket, ruang yang sudah
 * dikunjungi, dan (nanti) koleksi yang sudah diperiksa & kuis yang sudah dijawab.
 * Daftar quest dihitung dari status ini, jadi tidak ada data ganda yang bisa tidak sinkron.
 *
 * Status quest:
 *   done    — selesai
 *   active  — quest pertama yang belum selesai (yang sedang dikejar)
 *   pending — belum selesai, menunggu giliran
 *   locked  — fiturnya belum ada (koleksi & kuis), ditampilkan terkunci
 *
 * Pemakaian:
 *   const progress = new Progress({ roomCount: 8 });
 *   progress.onChange(({ active, activeChanged }) => { ... });
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

    this._listeners = [];
    this._activeId = this.activeQuest?.id ?? null;
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
      { id: 'kuis', label: 'Ikuti kuis tebak asal koleksi', available: this.quizAvailable,
        count: this.quizzesDone.size, total: this.quizCount,
        done: this.quizAvailable && this.quizzesDone.size >= this.quizCount },
    ];
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
    for (const fn of this._listeners) fn({ active, activeChanged });
  }
}