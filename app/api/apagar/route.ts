import { NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function POST() {
  return new Promise<NextResponse>((resolve) => {
    exec('shutdown /s /t 0', (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing shutdown command:', error);
        resolve(
          NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
          )
        );
      } else {
        resolve(NextResponse.json({ success: true }));
      }
    });
  });
}
