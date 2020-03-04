class Semaphore {
  constructor(max) {
    this.max = max;
    this.stone = 0;
    this.waitings = [];
  }

  acquire() {
    if (this.stone < this.max) {
      this.stone += 1;
      return new Promise(resolve => resolve());
    }
    return new Promise(resolve => {
      this.waitings.push({ resolve });
    });
  }

  release() {
    this.stone -= 1;
    if (this.waitings.length > 0) {
      this.stone += 1;
      const firstOne = this.waitings.shift();
      firstOne.resolve();
    }
  }

  lock() {
    if (this.stone === 0) {
      this.stone = this.max;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      let towait = this.stone;
      this.stone = this.max;
      const dec = () => {
        towait -= 1;
        if (towait === 0) {
          resolve();
        }
      };
      for (let i = 0; i < towait; i += 1) {
        this.waitings.push({ resolve: dec });
      }
    });
  }

  unlock() {
    for (let i = this.stone; i > 0; i -= 1) {
      this.release();
    }
  }
}

module.exports = Semaphore;
