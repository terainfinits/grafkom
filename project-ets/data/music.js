/*
 * Musik latar: kumpulan lagu daerah Indonesia versi jazz, dipotong per lagu dari satu
 * rekaman 65 menit (ffmpeg, MP3 96 kbps, fade 0,4 s / 1,2 s di tiap potongan supaya tidak berbunyi klik).
 * Dipakai audio/music.js (urutan putar) & ui/devPanel.js (pilih lagu di mode developer).
 *
 *  judul  : nama lagu (ditampilkan di menu Esc)
 *  file   : nama file di assets/audio/music/
 *  durasi : panjang lagu dalam detik (hanya keterangan)
 */
export const MUSIC_DIR = 'assets/audio/music/';

export const MUSIC_CREDIT = 'Lagu Daerah Indonesia (Jazz Version) · Mendy Vid';

export const TRACKS = [
  { judul: 'Rasa Sayange', file: '01-rasa-sayange.mp3', durasi: 157 },
  { judul: 'Sajojo', file: '02-sajojo.mp3', durasi: 293 },
  { judul: 'Angin Mamiri', file: '03-angin-mamiri.mp3', durasi: 210 },
  { judul: 'Desaku', file: '04-desaku.mp3', durasi: 113 },
  { judul: 'Yamko Rambe Yamko', file: '05-yamko-rambe-yamko.mp3', durasi: 145 },
  { judul: 'Anak Kambing Saya', file: '06-anak-kambing-saya.mp3', durasi: 141 },
  { judul: 'Ampar-Ampar Pisang', file: '07-ampar-ampar-pisang.mp3', durasi: 94 },
  { judul: 'Ayam den Lapeh', file: '08-ayam-den-lapeh.mp3', durasi: 159 },
  { judul: 'Bungong Jeumpa', file: '09-bungong-jeumpa.mp3', durasi: 214 },
  { judul: 'Butet', file: '10-butet.mp3', durasi: 242 },
  { judul: 'Cik Cik Periok', file: '11-cik-cik-periok.mp3', durasi: 120 },
  { judul: 'Cing Cangkeling', file: '12-cing-cangkeling.mp3', durasi: 143 },
  { judul: 'Gambang Suling', file: '13-gambang-suling.mp3', durasi: 190 },
  { judul: 'Gundul Pacul', file: '14-gundul-pacul.mp3', durasi: 144 },
  { judul: 'Indung-Indung', file: '15-indung-indung.mp3', durasi: 153 },
  { judul: 'Jali-Jali', file: '16-jali-jali.mp3', durasi: 163 },
  { judul: 'Jamuran', file: '17-jamuran.mp3', durasi: 148 },
  { judul: 'Kampuang nan Jauh di Mato', file: '18-kampuang-nan-jauh-di-mato.mp3', durasi: 159 },
  { judul: 'Manuk Dadali', file: '19-manuk-dadali.mp3', durasi: 222 },
  { judul: 'Rambadia', file: '20-rambadia.mp3', durasi: 166 },
  { judul: 'Rek Ayo Rek', file: '21-rek-ayo-rek.mp3', durasi: 73 },
  { judul: 'Soleram', file: '22-soleram.mp3', durasi: 203 },
  { judul: 'Suwe Ora Jamu', file: '23-suwe-ora-jamu.mp3', durasi: 119 },
  { judul: 'Tokecang', file: '24-tokecang.mp3', durasi: 157 },
];
