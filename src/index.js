class TimeKeeper {

	constructor(user, totalTime = 0) {
		this.user = user
		this.start = 0
		this.totalTime = totalTime
	}

	startRecord(start) {
		this.start = start
	}

	endRecord(end) {
		this.totalTime = this.totalTime + end - this.start;
		this.start = 0;

		return this.totalTime;
	}

}

const fs = require('fs');

const Discord = require("discord.js");
const config = require("./config.json");

const client = new Discord.Client();

let ranking;

fs.readFile("./rankings/latest.ranking", 'utf-8', (_err, data) => {
	ranking = JSON.parse(data);
})


ranking = ranking ? ranking : [];

client.login(process.env.BOT_TOKEN);

const users = [];

const millisToTime = (millis) => {
	const seconds = Math.floor(millis / 1000)
	const secs = seconds % 60
	const minutes = Math.floor(seconds / 60)
	const mins = minutes % 60
	const hours = Math.floor(minutes / 60)
	const h = hours % 24
	const days = Math.floor(hours / 24)
	const d = days % 7
	const weeks = Math.floor(days / 7)

	const time = `${weeks ? weeks === 1 ? "1 week" : weeks +  " weeks" : ""} ${d ? d === 1 ? "1 day" : d + " days" : ""} ${h ? h === 1 ? "1 hour" : h + " hours" : ""} ${mins ? min === 1 ? "1 minute" : mins + " minutes" : ""} ${secs === 1 ? "1 second" : secs + " seconds"}`

	return time
}

const fsErrorCallback = (error, fd) => {
	if (error) {
		console.error("ERROR SAVING DATA")
		console.error(error)
	}
}

client.on('ready', () => {
	console.log("Ready!")
	setInterval(() => {

		const json = JSON.stringify(ranking);
		fs.writeFile("./rankings/latest.ranking", json, fsErrorCallback)
		fs.writeFile(`./rankings/${(new Date()).toISOString().substring(0,10)}.ranking`, json, fsErrorCallback)

	}, config.save_timer)
})

client.on('voiceStateUpdate', (oldMember, newMember) => {
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
		users[newMember.id].startRecord(timeStamp.getTime())

	} else if (newMember.channelID === null) {
		if (users[oldMember.id]) {
			const time = users[oldMember.id].endRecord(timeStamp.getTime())
			ranking[oldMember.guild.id][oldMember.id] = ranking[oldMember.guild.id][oldMember.id] ? ranking[oldMember.guild.id][oldMember.id] + time : time;
		}
	}
})

client.on("message", (message) => {
	if (!message.guild) return
	if (!ranking[message.guild.id]) {
		ranking[message.guild.id] = {};
	}
	if (config.show_ranking_command_alias.filter((alias) => alias === message.content).length > 0) {
		let formattedRanking = "\n**VOICECALL STAY HIGHSCORES**\n";

		const list = []

		Object.keys(ranking[message.guild.id]).forEach(key => {
			list[key] = ranking[message.guild.id][key]
		})

		const promises = Object.keys(list).map((userID) => message.guild.members.fetch(userID).then((member) => [member.user.username, list[userID]]))

		Promise.all(promises).then((value) => {
			value.sort((a, b) => b[1] - a[1]).forEach((entries, index) => {
				formattedRanking += `${index + 1}.- **${entries[0]}** - ${millisToTime(entries[1])}\n`
			})
			message.reply(formattedRanking);
		}).catch(error => console.error(error, promises))
	}
})