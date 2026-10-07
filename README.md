# MEXC × DEX Spread Scanner

Минимальная веб-панель для мониторинга разницы цены MEXC Spot и DEX.

## Запуск
```bash
npm install
npm start
```
Открыть `http://localhost:3000`.

## Render
Build command: `npm install`
Start command: `npm start`

## Важно
MVP использует публичный MEXC spot ticker и DexScreener search. DEX-пара выбирается автоматически как наиболее ликвидная найденная пара по тикеру. Это мониторинг, а не торговый сигнал: контракт, сеть, ликвидность и исполнение нужно проверять вручную.
