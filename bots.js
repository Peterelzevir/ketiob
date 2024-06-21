const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const si = require('systeminformation');
const os = require('os');
const colors = require('colors');

const TOKEN = '6771880075:AAFgdx8J2mPaJDM2GXUu6ALZb5iqcrFjzo0';
const bot = new TelegramBot(TOKEN, { polling: true });

const scheduleFile = 'jadwal.json';

function ensureScheduleFile() {
    if (!fs.existsSync(scheduleFile)) {
        fs.writeFileSync(scheduleFile, '[]');
    }
}

function loadScheduledJobs() {
    ensureScheduleFile();
    try {
        const data = fs.readFileSync(scheduleFile);
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading schedule:', error);
        return [];
    }
}

function saveScheduledJobs() {
    fs.writeFile(scheduleFile, JSON.stringify(scheduledJobs, null, 2), (err) => {
        if (err) {
            console.error('Error saving schedule:', err);
        } else {
            console.log('Jadwal disimpan dalam file schedule.json');
        }
    });
}

let scheduledJobs = loadScheduledJobs();

function scheduleJob(job) {
    schedule.scheduleJob(job.time, () => {
        const options = { parse_mode: 'Markdown' };
        if (job.type === 'message') {
            bot.sendMessage(job.target, job.message, options);
        } else if (job.type === 'photo') {
            bot.sendPhoto(job.target, job.fileId, { caption: job.message, ...options });
        } else if (job.type === 'video') {
            bot.sendVideo(job.target, job.fileId, { caption: job.message, ...options });
        } else if (job.type === 'animation') {
            bot.sendAnimation(job.target, job.fileId, { caption: job.message, ...options });
        } else if (job.type === 'audio') {
            bot.sendAudio(job.target, job.fileId, { caption: job.message, ...options });
        } else if (job.type === 'voice') {
            bot.sendVoice(job.target, job.fileId, { caption: job.message, ...options });
        } else if (job.type === 'document') {
            bot.sendDocument(job.target, job.fileId, { caption: job.message, ...options });
        } else if (job.type === 'sticker') {
            bot.sendSticker(job.target, job.fileId);
        }
        job.sent = true;
        saveScheduledJobs();
    });
}

scheduledJobs.forEach(scheduleJob);

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `👋🏻 Hai saya adalah bot yang dapat membantu anda mengatur jadwal pesan yang akan dikirim ke channel/grup kamu\n\n📊 SUPPORT\n- Foto ✅\n- Video ✅\n- Audio ✅\n- Teks Biasa ✅\n- Voice Note ✅\n\n📩 note : dapat dengan caption\n\n➡️ Untuk informasi lainnya bisa klik button di bawah ini 🤩`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Lihat Fitur 🔥", callback_data: "fitur" }],
                [{ text: "Lihat Jadwal Pesan 🗓", callback_data: "lihatjadwal" }],
                [{ text: "Info Server 📊", callback_data: "infoserver" }]
            ]
        }
    });
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'fitur') {
        bot.sendMessage(chatId, `🏝 Berikut adalah fitur yang tersedia:\n\n1. /start - Memulai percakapan dengan bot\n2. /fitur - Melihat detail fitur bot\n3. /addjadwal <pesan> | <waktu> | <target> - Menambahkan jadwal pengiriman pesan atau media\n4. lihatjadwal - Melihat daftar jadwal yang belum terkirim\n5. /hapusjadwal <index> - Menghapus jadwal yang telah terkirim berdasarkan index\n6. /infoserver - Menampilkan informasi detail server`);
    } else if (data === 'lihatjadwal') {
        const response = scheduledJobs.length === 0
            ? `🧐 Tidak ada jadwal yang belum terkirim saat ini.`
            : '📋 Daftar jadwal yang belum terkirim :\n\n' +
              scheduledJobs.map((job, index) => !job.sent ? `${index + 1}. ${job.type.charAt(0).toUpperCase() + job.type.slice(1)} - ${moment(job.time).tz('Asia/Jakarta').format('DD/MM/YYYY, HH:mm:ss')} WIB ke ${job.target}\n` : '').join('');
        bot.sendMessage(chatId, response);
    } else if (data === 'infoserver') {
        getServerInfo().then(serverInfo => {
            bot.sendMessage(chatId, `\`\`\`${serverInfo}\`\`\``, { parse_mode: 'Markdown' });
        }).catch(error => {
            bot.sendMessage(chatId, `❌ Gagal mendapatkan informasi server.`);
        });
    }
});

bot.onText(/\/fitur/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `🏝 Berikut adalah fitur yang tersedia:\n\n1. /start - Memulai percakapan dengan bot 💤\n2. /fitur - Melihat detail fitur bot ✅\n3. /addjadwal <pesan> | <waktu> | <target> - Menambahkan jadwal pengiriman pesan atau media 🔐\n4. lihatjadwal - Melihat daftar jadwal yang belum terkirim 🗓\n5. /hapusjadwal <index> - Menghapus jadwal yang telah terkirim berdasarkan index 📊\n6. /infoserver - Menampilkan informasi detail server ⚡`);
});

bot.onText(/\/addjadwal (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1];

    const parts = input.split('|');
    if (parts.length !== 3) {
        bot.sendMessage(chatId, `❌ Format /addjadwal tidak valid\n🙋🏻‍♂️ Gunakan /addjadwal <pesan> | <waktu> | <target>\n\ncontoh penggunaan :\n 1.kirim pesan /addjadwal <teks pesan disini> | <waktu> | <target>\n\n\napa yang diisi dibagian target? yaitu id grup/username channel\n\napa itu waktu? waktu adalah dimana pesan tersebut dikirim sesuai dengan waktu yg kamu tentukan dengan format tahun-bulan-tanggal <spasi> jam.menit.detik\n\ncontoh penggunaan jika hanya ingin teks biasa : /addjadwal keren | 2024-06-16 20.12.00 | (username channel/id grup)\n\nkalo mau bot nya kirim foto dengan caption, kamu bisa kirim foto dengan pesan /addjadwal <caption foto yg diinginkan> cth foto keren | <waktu yg diinginkan> cth 2024-06-16 20.12.00 | (id grup/channel) maka otomatis bot kirim foto dengan caption yang sudah di setting ke channel/grup kamu sesuai dengan waktu yg sudah ditentukan oleh kamu 😎`);
        return;
    }

    const message = parts[0].trim();
    const waktuStr = parts[1].trim();
    const target = parts[2].trim();

    const waktu = moment.tz(waktuStr, "YYYY-MM-DD HH:mm:ss", "Asia/Jakarta");
    if (!waktu.isValid() || waktu.isBefore(moment())) {
        bot.sendMessage(chatId, `❌ Format waktu tidak valid atau waktu sudah lewat. Gunakan format seperti 2024-06-17 14:45:00 dan waktu harus di masa depan ya.`);
        return;
    }

    const newSchedule = {
        message: message,
        time: waktu.toDate(),
        target: target,
        type: 'message',
        sent: false,
        parse_mode: 'Markdown' // Menentukan parse_mode Markdown untuk memproses format teks khusus
    };

    scheduledJobs.push(newSchedule);
    saveScheduledJobs();

    bot.sendMessage(chatId, `✅ Jadwal untuk pesan telah diatur dan akan dikirim pada pukul ${waktu.format('DD/MM/YYYY, HH:mm:ss')} WIB (Waktu Indonesia Barat) ke ${target}\n\n➡️ note : jangan lupa untuk memasukkan bot kedalam grup/channel kamu ya!`);
    scheduleJob(newSchedule);
});

// Menghapus duplikasi bot.on('message') dengan membuat kondisi untuk format /addjadwal dalam onText

bot.onText(/\/hapusjadwal (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const index = parseInt(match[1], 10) - 1;

    if (index >= 0 && index < scheduledJobs.length) {
        const removedJob = scheduledJobs.splice(index, 1);
        saveScheduledJobs();
        bot.sendMessage(chatId, `✅ Jadwal nomor ${index + 1} berhasil dihapus.`);
    } else {
        bot.sendMessage(chatId, `❌ Jadwal nomor ${index + 1} tidak ditemukan.`);
    }
});

async function getServerInfo() {
    const mem = await si.mem();
    const cpu = await si.cpu();
    const osInfo = await si.osInfo();
    const currentLoad = await si.currentLoad();
    const disk = await si.fsSize();
    const networkInterfaces = await si.networkInterfaces();

    return `
💻 Hostname: ${os.hostname()}
📈 OS: ${osInfo.distro} ${osInfo.release} (${osInfo.arch})
🔥 CPU: ${cpu.manufacturer} ${cpu.brand} ${cpu.speed}GHz (${cpu.cores} cores)
💾 RAM: ${(mem.total / 1073741824).toFixed(2)} GB
📊 Used RAM: ${(mem.active / 1073741824).toFixed(2)} GB
⚡ Load: ${currentLoad.currentLoad.toFixed(2)}%
⚙️ Disk: ${(disk[0].size / 1073741824).toFixed(2)} GB
📈 Used Disk: ${(disk[0].used / 1073741824).toFixed(2)} GB
🌐 Network: ${networkInterfaces[0].iface} - ${networkInterfaces[0].ip4}
    `;
}

bot.onText(/\/infoserver/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const serverInfo = await getServerInfo();
        bot.sendMessage(chatId, `\`\`\`${serverInfo}\`\`\``, { parse_mode: 'Markdown' });
    } catch (error) {
        bot.sendMessage(chatId, `❌ Gagal mendapatkan informasi server.`);
    }
});

bot.on('message', (msg) => {
    console.log(colors.cyan(`[${moment().tz('Asia/Jakarta').format('DD/MM/YYYY, HH:mm:ss')} WIB]`), colors.magenta(`[${msg.from.first_name} ${msg.from.last_name ? msg.from.last_name : ''} (ID: ${msg.from.id})]`), colors.yellow(`[${msg.chat.type} - ${msg.chat.title ? msg.chat.title : 'Private'}]`));
    console.log(colors.green(`[Pesan]:`), colors.white(msg.text ? msg.text : JSON.stringify(msg, null, 2)));
});

bot.on('callback_query', (query) => {
    console.log(colors.cyan(`[${moment().tz('Asia/Jakarta').format('DD/MM/YYYY, HH:mm:ss')} WIB]`), colors.magenta(`[${query.from.first_name} ${query.from.last_name ? query.from.last_name : ''} (ID: ${query.from.id})]`), colors.yellow(`[${query.message.chat.type} - ${query.message.chat.title ? query.message.chat.title : 'Private'}]`));
    console.log(colors.green(`[Callback Query]:`), colors.white(query.data));
});

// Pastikan hanya ada satu bot.on('message') untuk menangani semua jenis pesan termasuk media

console.log(colors.yellow('[Bot Started]'), colors.green(`[${moment().tz('Asia/Jakarta').format('DD/MM/YYYY, HH:mm:ss')} WIB]`));
