const path = require("path");
const ENV_PATH = path.join(__dirname, "bot.env")
require("dotenv").config({path: ENV_PATH});
const fs = require("fs");
const {Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, Events} = require('discord.js');
const token = process.env.BOTTOKEN;
const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]});  //clientインスタンスを作成する
const File_resjson_path = __dirname + "/response.json";

//スラッシュコマンドの設定
const comm = new SlashCommandBuilder().setName("marimo").setDescription("marimo")
    .addSubcommand(subcommand => subcommand
        .setName("add")
        .setDescription("add responce")
        .addStringOption(option => option
            .setName("word")
            .setDescription("word")
            .setRequired(true))
        .addStringOption(option => option
            .setName("response")
            .setDescription("response")
            .setRequired(true)))
    .addSubcommand(subcommand => subcommand
        .setName("delete")
        .setDescription("delete response")
        .addStringOption(option => option
            .setName("delete_word")
            .setDescription("delete_word")
            .setRequired(true)))
    .addSubcommand(subcommand => subcommand
        .setName("list")
        .setDescription("show all response list"))
    .addSubcommand(subcommand => subcommand
        .setName("help")
        .setDescription("help"));
//スラッシュコマンドの登録
const commands = [comm];
const rest = new REST({version: "10"}).setToken(token);
const clientId = process.env.CLIENTID;

client.once(Events.ClientReady, async() => {
	console.log('ready');
    const guilds = await client.guilds.fetch();
    console.log("serverlist=" + guilds.map(a => a.name));
    guilds.each(async guild => {
        await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: commands });
    });
});

//レス処理
const escape_sequence_array_strange = ["\\a", "\\b", "\\f", "\\n", "\\r", "\\t", "\\v", "\\?", "\\'", `\\"`, "\\0", "\\"];
const escape_sequence_array = ["\a", "\b", "\f", "\n", "\r", "\t", "\v", "\?", "\'", `\"`, "\0", "\\"];
client.on(Events.MessageCreate, (message) => {
    if(message.author.bot){
        return;
    }
    const responses = JSON.parse(fs.readFileSync(File_resjson_path, 'utf8')).responses;
    for(i = 0; i < responses.length; i++){
        if(message.guildId === responses[i].serverid){
            for(j = 0; j < responses[i].res.length; j++){
                if(message.content === responses[i].res[j].word){
                    let channel_id = message.channelId;
                    let masterdata = responses[i].res[j].response_word;
                    if(masterdata.indexOf("\\") === -1){
                        client.channels.cache.get(channel_id).send(masterdata);
                        return;
                    }else{
                        for(k = 0; k < escape_sequence_array_strange.length; k++){
                            if(masterdata.indexOf(escape_sequence_array_strange[k]) !== -1){
                                let data = masterdata.split(escape_sequence_array_strange[k]);
                                let newstring = "";
                                for(l = 0; l < data.length; l++){
                                    if(l == data.length - 1){
                                        newstring += data[l];
                                    }else{
                                        newstring += data[l] + escape_sequence_array[k];
                                    }
                                }
                                client.channels.cache.get(channel_id).send(newstring);
                                return;
                            }
                        }
                    }
                }
            }
        }
    }
});

//スラッシュコマンド処理
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()){
        return;
    }
    if(interaction.commandName === "marimo"){
        if(interaction.options.getSubcommand() === "add"){
            const server_id = interaction.guildId;
            const word = interaction.options.getString("word");
            const response = interaction.options.getString("response");
            let data_txt = "list:\n"
            const response_json = JSON.parse(fs.readFileSync(File_resjson_path, 'utf8')).responses;
            let masterData = [];

            //オブジェクトに追記
            if(response_json.length == 0){
                masterData.push({
                    serverid : server_id,
                    res : [{
                        word : word,
                        response_word : response
                    }]
                });
            }else{
                //既存のレスポンスをオブジェクトに入れる
                for(i = 0; i < response_json.length; i++){
                    masterData.push({
                        serverid : response_json[i].serverid,
                        res : []
                    });

                    for(j = 0; j < response_json[i].res.length; j++){
                        masterData[i].res[j] = {
                            word : response_json[i].res[j].word,
                            response_word : response_json[i].res[j].response_word
                        }
    
                        if(response_json[i].serverid == server_id){
                            data_txt += response_json[i].res[j].word + "\n";
                            if(response_json[i].res[j].word === word){
                                await interaction.reply({content : "既にそのワードは登録されています", ephemeral : true});
                                return;
                            }
                        }
                    }
                }
                //新しいレスポンスをオブジェクトに入れる
                for(i = 0; i < response_json.length; i++){
                    if(response_json[i].serverid === server_id){
                        masterData[i].res[response_json[i].res.length] = {
                            word : word,
                            response_word : response
                        }
                        break;
                    }else if(i == response_json.length - 1){
                        masterData.push({
                            serverid : server_id,
                            res : [{
                                word : word,
                                response_word : response
                            }]
                        });
                    }
                }
            }

            data_txt += word + "\n";
            let newMainNData = JSON.stringify({responses: masterData}, null, ' ');
            fs.writeFileSync(File_resjson_path, newMainNData);
            await interaction.reply({content : "completed process\n" + data_txt, ephemeral : true});
        }else if(interaction.options.getSubcommand() === "delete"){
            const server_id = interaction.guildId;
            const delete_word = interaction.options.getString("delete_word");
            const response_json = JSON.parse(fs.readFileSync(File_resjson_path, 'utf8')).responses;
            let masterData = [];
            let data_txt = "list:\n";

            if(response_json.length == 0){
                await interaction.reply({content : "何もワードは登録されていません", ephemeral : true});
                return;
            }

            for(i = 0; i < response_json.length; i++){
                var newdata = {
                    serverid : response_json[i].serverid,
                    res : []
                }
                masterData.push(newdata);
                for(j = 0; j < response_json[i].res.length; j++){
                    masterData[i].res[j] = {
                        word : response_json[i].res[j].word,
                        response_word : response_json[i].res[j].response_word
                    }
                }
            }

            //jsonファイルから削除
            for(i = 0; i < response_json.length; i++){
                if(response_json[i].serverid === server_id){
                    if(response_json[i].res.length == 0){
                        await interaction.reply({content : "削除できる登録されたワードはありません", ephemeral : true});
                        return;
                    }
                    for(j = 0; j < response_json[i].res.length; j++){
                        if(response_json[i].res[j].word === delete_word){
                            masterData[i].res.splice(j, 1);
                            for(k = 0; k < masterData[i].res.length; k++){
                                data_txt += masterData[i].res[k].word + "\n";
                            }
                            let newMainNData = JSON.stringify({responses: masterData}, null, ' ');
                            fs.writeFileSync(File_resjson_path, newMainNData);
                            await interaction.reply({content : "completed process\n" + data_txt, ephemeral : true});
                            return;
                        }else if(j == response_json[i].res.length - 1){
                            await interaction.reply({content : "削除できる登録されたワードはありません", ephemeral : true});
                            return;
                        }
                    }
                }else if(i == response_json.length - 1){
                    await interaction.reply({content : "まだ何もワードは登録されていません", ephemeral : true});
                    return;
                }
            }
        }else if(interaction.options.getSubcommand() === "list"){
            const response_json = JSON.parse(fs.readFileSync(File_resjson_path, 'utf8')).responses;
            let data_txt = "list:\n";
            //一覧表示
            if(response_json.length == 0){
                await interaction.reply({content : "まだ何もワードは登録されていません", ephemeral : true});
                return;
            }
            for(i = 0; i < response_json.length; i ++){
                if(interaction.guildId === response_json[i].serverid){
                    for(j = 0; j < response_json[i].res.length; j++){
                        data_txt += response_json[i].res[j].word + "\n";
                    }
                }
            }
            await interaction.reply({content : data_txt, ephemeral : true});
        }else if(interaction.options.getSubcommand() === "help"){
            //ヘルプ表示
            const help_txt ="このbotは特定のワードに反応しレスを返します\ncommand\nadd : 反応するワードとレスを登録  (マークダウン及びエスケープシーケンスに対応)\ndelete : 反応するワードとレスを消去\nlist : 反応するワード一覧を表示";
            await interaction.reply({content : help_txt, ephemeral : true});
        }
    }
});

client.login(token);