// lib/rabbitmq.ts
import amqp from 'amqplib';
import {RABBITMQ_HOST} from './envVar'

// export async function consumeExchange(
//   exchangeName: string,
//   type: 'fanout' | 'direct' | 'topic',
//   onMessage: (msg: string) => void,
// ) {
//   const connection = await amqp.connect(`amqp://${RABBITMQ_HOST}`);
//   const channel = await connection.createChannel();

//   await channel.assertExchange(exchangeName, type, { durable: false });
//   const q = await channel.assertQueue('', { exclusive: true });
//   await channel.bindQueue(q.queue, exchangeName, '');

//   console.log("rabbitmq connect start")

//   channel.consume(q.queue, (msg) => {
//     if (msg?.content) {
//       onMessage(msg.content.toString());
//     }
//   }, { noAck: true });
// }

export async function consumeExchange(
  exchangeName: string,
  type: 'fanout' | 'direct' | 'topic',
  onMessage: (msg: string) => void,
  retryDelay = 5000 // задержка перед повторным подключением (мс)
) {
  let connection: amqp.ChannelModel | null = null;
  let channel: amqp.Channel | null = null;

  async function connect() {
    try {
      console.log(`[RabbitMQ] Connecting to ${RABBITMQ_HOST}...`);
      connection = await amqp.connect(`amqp://${RABBITMQ_HOST}`);
      channel = await connection.createChannel();

      await channel.assertExchange(exchangeName, type, { durable: false });
      const q = await channel.assertQueue('', { exclusive: true });
      await channel.bindQueue(q.queue, exchangeName, '');

      console.log(`[RabbitMQ] Connected and consuming from "${exchangeName}"`);

      channel.consume(
        q.queue,
        (msg) => {
          if (msg?.content) onMessage(msg.content.toString());
        },
        { noAck: true }
      );

      // 👉 Подписываемся на события закрытия и ошибок
      connection.on('error', (err) => {
        console.error('[RabbitMQ] Connection error:', err.message);
      });

      connection.on('close', () => {
        console.warn('[RabbitMQ] Connection closed. Reconnecting...');
        reconnect();
      });

    } catch (err) {
      console.error('[RabbitMQ] Connection failed:', (err as Error).message);
      reconnect();
    }
  }

  function reconnect() {
    setTimeout(() => {
      connect();
    }, retryDelay);
  }

  // запускаем первую попытку подключения
  await connect();
}
