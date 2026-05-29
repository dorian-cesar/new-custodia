import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shopProcessId, amount, currency, description, servicio, canal, id } = body;

    // Use environment variables or fallback to staging keys for testing
    const publicKey = process.env.BANCARD_PUBLIC_KEY || 'sandbox_public_key';
    const privateKey = process.env.BANCARD_PRIVATE_KEY || 'sandbox_private_key';

    // Format amount as string with two decimals if needed (though PYG usually doesn't have decimals, Bancard API often expects it as string, e.g. "15000.00")
    const formattedAmount = Number(amount).toFixed(2);

    // Generate MD5 Token: private_key + shop_process_id + amount + currency
    const tokenString = `${privateKey}${shopProcessId}${formattedAmount}${currency}`;
    const token = crypto.createHash('md5').update(tokenString).digest('hex');

    const bancardPayload = {
      public_key: publicKey,
      operation: {
        token: token,
        shop_process_id: shopProcessId,
        currency: currency,
        amount: formattedAmount,
        description: description || 'Venta',
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/bancard/callback`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/bancard/callback`,
        additional_data: {
          servicio,
          canal,
          id
        }
      }
    };

    // Staging endpoint
    const bancardApiUrl = 'https://vpos.infonet.com.py:8888/vpos/api/0.3/single_buy';

    const response = await fetch(bancardApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bancardPayload)
    });

    const data = await response.json();

    if (data.status === 'success') {
      return NextResponse.json({ data: { processId: data.process_id } });
    } else {
      console.error('Bancard API error:', data);
      return NextResponse.json({ error: 'Error al generar processId de Bancard', details: data }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in /api/bancard/pagosimple:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
