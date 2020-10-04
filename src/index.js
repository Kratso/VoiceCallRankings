class TimeKeeper {
	constructor(user, totalTime = 0) {
		this.user = user;
		this.start = 0;
		this.totalTime = totalTime;
	}

	startRecord(start) {
		this.start = start;
	}

	endRecord(end) {
		console.log(this.start, end, end - this.start)
		this.totalTime = this.totalTime + end - this.start;
		this.start = 0;

		return this.totalTime;
	}
}

const fs = require("fs");

const Discord = require("discord.js");
const config = require("./config.json");

const client = new Discord.Client();

let ranking;

const users = [];


fs.readFile("./rankings/latest.ranking", "utf-8", (_err, data) => {
	if (data) {
		ranking = JSON.parse(data);
	}
});

client.login(process.env.BOT_TOKEN);


ranking = ranking ? ranking : {};



const millisToTime = (millis) => {
	const seconds = Math.floor(millis / 1000);
	const secs = seconds % 60;
	const minutes = Math.floor(seconds / 60);
	const mins = minutes % 60;
	const hours = Math.floor(minutes / 60);
	const h = hours % 24;
	const days = Math.floor(hours / 24);
	const d = days % 7;
	const weeks = Math.floor(days / 7);

	const time = `${weeks ? (weeks === 1 ? "1 week" : weeks + " weeks") : ""} ${d ? (d === 1 ? "1 day" : d + " days") : ""} ${h ? (h === 1 ? "1 hour" : h + " hours") : ""} ${mins ? (mins === 1 ? "1 minute" : mins + " minutes") : ""} ${secs === 1 ? "1 second" : secs + " seconds"}`;

	return time;
};

const fsErrorCallback = (error, fd) => {
	if (error) {
		console.error("ERROR SAVING DATA");
		console.error(error);
	}
};

const saveMemory = (data) => {
	const json = JSON.stringify(data);
	fs.writeFile("./rankings/latest.ranking", json, fsErrorCallback);
	fs.writeFile(
		`./rankings/${new Date().toISOString().substring(0, 10)}.ranking`,
		json,
		fsErrorCallback
	);
}

console.log("post-login")
client.on("ready", () => {
	console.log("Ready!");
	Object.keys(ranking[Object.keys(ranking)[0]]).forEach((userId) => {
		users[userId] = new TimeKeeper(userId, ranking[Object.keys(ranking)[0]][userId])
	})
	setInterval(() => {
		saveMemory(data)
	}, config.save_timer);
});

client.on("voiceStateUpdate", (oldMember, newMember) => {
	const timeStamp = new Date();

	if (newMember) {
		if (!ranking[newMember.guild.id]) {
			ranking[newMember.guild.id] = {};
		}
	}
	if (oldMember.channelID == null && newMember.channelID != null) {
		if (!users[newMember.id]) {
			users[newMember.id] = new TimeKeeper(newMember.id);
		}
		users[newMember.id].startRecord(timeStamp.getTime());
		console.log(users[newMember.id].start, timeStamp.getTime())
	} else if (newMember.channelID === null) {
		if (users[oldMember.id]) {
			console.log(users[oldMember.id].start)
			const time = users[oldMember.id].endRecord(timeStamp.getTime());
			console.log(time)
			ranking[oldMember.guild.id][oldMember.id] = ranking[oldMember.guild.id][
					oldMember.id
				] ?
				ranking[oldMember.guild.id][oldMember.id] + time :
				time;
		}
	}
});

client.on("message", (message) => {
	if (!message.guild) return;
	if (!ranking[message.guild.id]) {
		ranking[message.guild.id] = {};
	}
	if (users.length !== Object.keys(ranking[message.guild.id]).length) {
		Object.keys(ranking[message.guild.id]).filter((userId) => (users[userId])).forEach(userId => {
			users[userId] = new TimeKeeper(userId, ranking[message.guild.id][userId]);
		})
	}
	if (
		config.show_ranking_command_alias.filter(
			(alias) => alias === message.content
		).length > 0
	) {
		let formattedRanking = "\n**VOICECALL STAY HIGHSCORES**\n";

		const promises = Object.keys(ranking[message.guild.id]).map((userID) =>
			message.guild.members
			.fetch(userID)
			.then((member) => [member.user.username, ranking[message.guild.id][userID]])
		);

		Promise.all(promises)
			.then((value) => {
				value
					.sort((a, b) => b[1] - a[1])
					.forEach((entries, index) => {
						formattedRanking += `${index + 1}.- **${entries[0]}** - ${millisToTime(entries[1])}\n`;
					});
				message.reply(formattedRanking);
			})
			.catch((error) => console.error(error, promises));
	}

	if (config.save_current_ranking_alias.filter(
			(alias) => alias === message.content
		).length > 0) {
		saveMemory(ranking);

		setTimeout(() => {
			message.reply("Data Saved");
		}, 1000)
	}
});