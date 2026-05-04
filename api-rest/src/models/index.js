const Client = require('./Client');
const Key = require('./Key');
const AuditLog = require('./AuditLog');

// Asociaciones (si se requieren)
Client.hasMany(Key, { foreignKey: 'client_id' });
Key.belongsTo(Client, { foreignKey: 'client_id' });
Client.hasMany(AuditLog, { foreignKey: 'client_id' });
AuditLog.belongsTo(Client, { foreignKey: 'client_id' });

module.exports = { Client, Key, AuditLog };
