// MongoDB initialization script
// This runs when MongoDB container starts for the first time

print('Starting MongoDB initialization...');

// Switch to the bracket_of_death database
db = db.getSiblingDB('bracket_of_death');

// Create application user with read/write permissions
db.createUser({
  user: 'bodapp',
  pwd: 'bodapppassword123',
  roles: [
    {
      role: 'readWrite',
      db: 'bracket_of_death'
    }
  ]
});

// Create collections with validation schemas
db.createCollection('players', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        firstName: {
          bsonType: 'string',
          description: 'must be a string'
        },
        lastName: {
          bsonType: 'string',
          description: 'must be a string'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          description: 'must be a valid email address if provided'
        },
        gender: {
          enum: ['male', 'female', 'other'],
          description: 'must be a valid gender enum'
        },
        bracketPreference: {
          enum: ['mens', 'womens', 'mixed'],
          description: 'must be a valid bracket preference'
        },
        phone: {
          bsonType: 'string',
          description: 'must be a string if provided'
        },
        city: {
          bsonType: 'string',
          description: 'must be a string if provided'
        },
        state: {
          bsonType: 'string',
          description: 'must be a string if provided'
        },
        gamesPlayed: {
          bsonType: 'number',
          minimum: 0,
          description: 'must be a non-negative number'
        },
        gamesWon: {
          bsonType: 'number',
          minimum: 0,
          description: 'must be a non-negative number'
        },
        winningPercentage: {
          bsonType: 'number',
          minimum: 0,
          maximum: 1,
          description: 'must be a number between 0 and 1'
        }
      }
    }
  }
});

db.createCollection('tournaments', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['bodNumber', 'date', 'format', 'location'],
      properties: {
        bodNumber: {
          bsonType: 'int',
          minimum: 1,
          description: 'must be a positive integer and is required'
        },
        date: {
          bsonType: 'date',
          description: 'must be a valid date and is required'
        },
        format: {
          bsonType: 'string',
          enum: ['Round Robin', 'Elimination', 'Swiss'],
          description: 'must be one of the allowed tournament formats'
        },
        location: {
          bsonType: 'string',
          description: 'must be a string and is required'
        }
      }
    }
  }
});

db.createCollection('tournamentresults', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['tournamentId', 'playerId', 'placement'],
      properties: {
        tournamentId: {
          bsonType: 'objectId',
          description: 'must be a valid ObjectId and is required'
        },
        playerId: {
          bsonType: 'objectId',
          description: 'must be a valid ObjectId and is required'
        },
        placement: {
          bsonType: 'int',
          minimum: 1,
          description: 'must be a positive integer and is required'
        },
        gamesPlayed: {
          bsonType: 'int',
          minimum: 0,
          description: 'must be a non-negative integer'
        },
        gamesWon: {
          bsonType: 'int',
          minimum: 0,
          description: 'must be a non-negative integer'
        }
      }
    }
  }
});

// Create indexes for better performance
db.players.createIndex({ email: 1 }, { unique: true, sparse: true });
db.players.createIndex({ firstName: 1, lastName: 1 });
db.players.createIndex({ state: 1 });
db.players.createIndex({ winningPercentage: -1 });

db.tournaments.createIndex({ bodNumber: 1 }, { unique: true });
db.tournaments.createIndex({ date: -1 });
db.tournaments.createIndex({ format: 1 });
db.tournaments.createIndex({ location: 1 });

db.tournamentresults.createIndex({ tournamentId: 1 });
db.tournamentresults.createIndex({ playerId: 1 });
db.tournamentresults.createIndex({ placement: 1 });
db.tournamentresults.createIndex({ tournamentId: 1, playerId: 1 }, { unique: true });

print('MongoDB initialization completed successfully!');
print('Created database: bracket_of_death');
print('Created user: bodapp');
print('Created collections: players, tournaments, tournamentresults');
print('Created indexes for optimal performance');