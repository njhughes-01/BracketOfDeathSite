
import mongoose from 'mongoose';
import { LiveTournamentController } from '../src/controllers/LiveTournamentController';
import { Tournament } from '../src/models/Tournament';

async function advanceTournament() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/bracket-of-death';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const tournament = await Tournament.findOne({ status: { $in: ['in_progress', 'active'] } }).sort({ createdAt: -1 });

        if (!tournament) {
            console.log('No active tournament found.');
            return;
        }

        console.log(`Found tournament: ${tournament.name || (tournament as any).bodNumber} (${tournament._id})`);

        // We need to bypass the protected access modifier
        const controller = new LiveTournamentController();
        const controllerAny = controller as any;

        // Determine what to do based on phase
        // We can't easily read phase from here without calculating it (which getLiveTournament does)
        // But we know where we are: 
        // If RR finished -> Start Bracket
        // If Bracket -> Advance Round

        // Let's use the 'action' logic from executeTournamentAction roughly? 
        // No, simpler to just call specific methods if we know where we are.
        // Or just try advanceRound. 
        // If we are in QF (bracket phase), advanceRound should work.

        // Check if bracket started?
        // Tournament model has 'phase' string? No, phase is calculated dynamic.
        // But 'managementState.currentRound' exists.

        console.log('Current state:', (tournament as any).managementState);

        // Try advanceRound
        console.log('Attempting to advance round...');

        // Note: advanceRound checks if current round is complete.
        // We ran complete_active_round.js, so matches should be complete.

        try {
            const result = await controllerAny.advanceRound(tournament);
            console.log('Advance Round Result:', result ? 'Success' : 'Null (No change?)');
            if (result) {
                console.log('New Round:', result.managementState?.currentRound);
            }
        } catch (err: any) {
            console.error('Error advancing round:', err.message);
            // If it failed, maybe we need startBracket?
            // But we already started bracket earlier (page crash happened after).
        }

    } catch (error) {
        console.error('Script Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

advanceTournament();
