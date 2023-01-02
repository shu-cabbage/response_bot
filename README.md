# response bot
特定のワードに対してレスポンスをするdiscord bot

## 設定
node.jsをインストール  
ルートディレクトリ内で，npm installを実行  
[ここ](https://discord.com/developers)でbotを作り，tokenとclient idをbot.envに記載 (botの作成方法は多くのサイトにあるので割愛)  
botをdiscordサーバに入れる  
node index.jsを実行し，bot起動

## 使い方
botが反応する言葉をポストする

## スラッシュコマンド
・add  
反応させる言葉と，レスポンスする言葉を登録する  
・delete  
反応させる言葉と，レスポンスする言葉を消去する  
・list  
反応する言葉一覧を表示する  
・help  
ヘルプを表示する
