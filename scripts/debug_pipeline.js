const pipelineSteps = [
    // ... Previous steps ...
    { $match: {} },
    { $lookup: { from: 'tournaments', localField: 'tournamentId', foreignField: '_id', as: 'tournament' } },
    { $unwind: '$tournament' },
    { $match: { 'tournament.date': { $gte: ISODate('2025-01-01T00:00:00Z'), $lte: ISODate('2025-12-31T23:59:59Z') } } },
    { $unwind: '$players' },

    // Step 6: Group
    {
        $group: {
            _id: '$players',
            totalTournaments: { $sum: 1 },
            totalWins: { $sum: '$totalStats.totalWon' },
            // ... minimal fields for count
        }
    },

    // Step 7: Lookup Player
    {
        $lookup: {
            from: 'players',
            localField: '_id',
            foreignField: '_id',
            as: 'playerDetails',
        },
    },

    // Step 8: Project Name
    {
        $addFields: {
            name: { $arrayElemAt: ['$playerDetails.name', 0] },
        }
    }
];

// Verify players exist
print("Total Players:", db.players.countDocuments());

let currentPipeline = [];
pipelineSteps.forEach((step, index) => {
    currentPipeline.push(step);

    const countPipeline = [...currentPipeline, { $count: "count" }];
    const result = db.tournamentresults.aggregate(countPipeline).toArray();
    const count = result.length > 0 ? result[0].count : 0;

    print(`Step ${index + 1} (${Object.keys(step)[0]}): ${count} documents`);

    if (index === pipelineSteps.length - 1 && count > 0) {
        print("Sample result:");
        printjson(db.tournamentresults.aggregate([...currentPipeline, { $limit: 1 }]).toArray());
    }
});
