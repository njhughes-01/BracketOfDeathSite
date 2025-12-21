printjson(db.tournaments.aggregate([
    {
        $project: {
            year: { $year: '$date' }
        }
    },
    {
        $group: {
            _id: null,
            minYear: { $min: '$year' },
            maxYear: { $max: '$year' },
            allYears: { $addToSet: '$year' }
        }
    },
    {
        $project: {
            _id: 0,
            range: { $concat: [{ $toString: "$minYear" }, " - ", { $toString: "$maxYear" }] },
            allYears: { $sortArray: { input: "$allYears", sortBy: 1 } }
        }
    }
]).toArray());
