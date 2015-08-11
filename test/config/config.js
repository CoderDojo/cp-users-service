
module.exports = function() {

  function pgConfig() {
    return {
      name: process.env.POSTGRES_NAME,
      host: process.env.POSTGRES_HOST || '127.0.0.1',
      port: process.env.POSTGRES_PORT || 5432,
      username: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD
    }
  }

  function esConfig() {
    return {
      connection: {
        host : (process.env.ES_HOST || '127.0.0.1') + ':9200',
        index: process.env.ES_INDEX,
        sniffOnStart: false,
        sniffInterval: false
      }
    };
  }

  return {
    'postgresql-store': pgConfig(),
    elasticsearch: esConfig(),
    'recaptcha_secret_key': '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe',
    transport: {
      type: 'web',
      web: {
        host: '0.0.0.0',
        port: 10303
      }
    },
    strict: {add:false,  result:false}
  };
}
