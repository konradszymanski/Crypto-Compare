const { createStaticServer } = require('./static-server');

module.exports = async () => {
    const server = createStaticServer();
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(4174, '127.0.0.1', resolve);
    });

    return async () => {
        await new Promise((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve());
            server.closeAllConnections();
        });
    };
};

