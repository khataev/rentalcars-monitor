
let util = function() {
  this.sleep = function (ms) {
    return new Promise(resolve => {
      console.log(`sleep for ${ms} ms`);
      setTimeout(resolve, ms);
    })
    .catch(error => (console.log(error)));
  };

  this.asyncForEach = async function (array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(index, array[index])
    }
  };

};

module.exports = new util();