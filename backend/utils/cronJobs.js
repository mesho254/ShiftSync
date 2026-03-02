import cron from 'node-cron';
import SwapRequest from '../models/SwapRequest.js';
import Shift from '../models/Shift.js';
import { createNotification } from './notifications.js';

export const startCronJobs = () => {
  // Run every hour to check for expired swap requests
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Running swap expiration check...');
      
      const now = new Date();
      const expiredSwaps = await SwapRequest.find({
        status: 'pending',
        expiresAt: { $lte: now }
      });
      
      for (const swap of expiredSwaps) {
        swap.status = 'expired';
        await swap.save();
        
        // Clear pending swap from shift
        await Shift.findByIdAndUpdate(swap.shiftId, { pendingSwap: null });
        
        // Notify requester
        await createNotification({
          userId: swap.requesterId,
          category: 'swap_rejected',
          title: 'Swap Request Expired',
          body: 'Your swap request has expired',
          payload: { swapId: swap._id }
        });
      }
      
      console.log(`Expired ${expiredSwaps.length} swap requests`);
    } catch (error) {
      console.error('Error in swap expiration job:', error);
    }
  });
  
  console.log('✅ Cron jobs started');
};
