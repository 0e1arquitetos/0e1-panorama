/*
 * QRCode for JavaScript
 *
 * Copyright (c) 2009 Kazuhiko Arase
 * URL: http://www.d-project.com/
 *
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 * The word "QR Code" is registered trademark of DENSO WAVE INCORPORATED
 */

const QRCode = (function () {
  const PAD0 = 0xEC;
  const PAD1 = 0x11;

  function QR8bitByte(data) {
    this.mode = QRMode.MODE_8BIT_BYTE;
    this.data = data;
  }

  QR8bitByte.prototype = {
    getLength: function () {
      return this.data.length;
    },
    write: function (buffer) {
      for (let i = 0; i < this.data.length; i++) {
        buffer.put(this.data.charCodeAt(i), 8);
      }
    }
  };

  const QRMode = {
    MODE_NUMBER: 1 << 0,
    MODE_ALPHA_NUM: 1 << 1,
    MODE_8BIT_BYTE: 1 << 2,
    MODE_KANJI: 1 << 3
  };

  const QRErrorCorrectLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2
  };

  const QRMaskPattern = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7
  };

  const QRUtil = (function () {
    const PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];

    const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    const G15_MASK = (1 << 12) | (1 << 10) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);

    const BITS_LIMIT_TABLE = [
      0, 152, 272, 440, 640, 864, 1088, 1248, 1552, 1856, 2192, 2592, 2960, 3424, 3688,
      4184, 4712, 5176, 5768, 6360, 6888, 7456, 8048, 8752, 9392, 10208, 10960, 11744,
      12248, 13048, 13880, 14744, 15640, 16568, 17528, 18448, 19472, 20528, 21616,
      22496, 23648, 24864
    ];

    function getBCHDigit(data) {
      let digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    }

    function getBCHTypeInfo(data) {
      let d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= G15 << (getBCHDigit(d) - getBCHDigit(G15));
      }
      return ((data << 10) | d) ^ G15_MASK;
    }

    function getBCHTypeNumber(data) {
      let d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= G18 << (getBCHDigit(d) - getBCHDigit(G18));
      }
      return (data << 12) | d;
    }

    function getPatternPosition(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    }

    function getMask(maskPattern, i, j) {
      switch (maskPattern) {
        case QRMaskPattern.PATTERN000:
          return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001:
          return i % 2 === 0;
        case QRMaskPattern.PATTERN010:
          return j % 3 === 0;
        case QRMaskPattern.PATTERN011:
          return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case QRMaskPattern.PATTERN101:
          return ((i * j) % 2) + ((i * j) % 3) === 0;
        case QRMaskPattern.PATTERN110:
          return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
        case QRMaskPattern.PATTERN111:
          return (((i + j) % 2) + ((i * j) % 3)) % 2 === 0;
        default:
          throw new Error('bad maskPattern:' + maskPattern);
      }
    }

    function getErrorCorrectPolynomial(errorCorrectLength) {
      let a = new QRPolynomial([1], 0);
      for (let i = 0; i < errorCorrectLength; i++) {
        a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      }
      return a;
    }

    function getLengthInBits(mode, type) {
      if (1 <= type && type < 10) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 10;
          case QRMode.MODE_ALPHA_NUM:
            return 9;
          case QRMode.MODE_8BIT_BYTE:
            return 8;
          case QRMode.MODE_KANJI:
            return 8;
          default:
            throw new Error('mode:' + mode);
        }
      } else if (type < 27) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 12;
          case QRMode.MODE_ALPHA_NUM:
            return 11;
          case QRMode.MODE_8BIT_BYTE:
            return 16;
          case QRMode.MODE_KANJI:
            return 10;
          default:
            throw new Error('mode:' + mode);
        }
      } else if (type < 41) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 14;
          case QRMode.MODE_ALPHA_NUM:
            return 13;
          case QRMode.MODE_8BIT_BYTE:
            return 16;
          case QRMode.MODE_KANJI:
            return 12;
          default:
            throw new Error('mode:' + mode);
        }
      } else {
        throw new Error('type:' + type);
      }
    }

    function getLostPoint(qrCode) {
      const moduleCount = qrCode.getModuleCount();
      let lostPoint = 0;

      for (let row = 0; row < moduleCount; row++) {
        let sameCount = 0;
        let head = null;
        for (let col = 0; col < moduleCount; col++) {
          const current = qrCode.isDark(row, col);
          if (col === 0) {
            head = current;
            sameCount = 1;
          } else {
            if (current === head) {
              sameCount++;
            } else {
              head = current;
              sameCount = 1;
            }
          }
          if (sameCount >= 5) {
            lostPoint += 3 + (sameCount - 5);
          }
        }
      }

      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        let head = null;
        for (let row = 0; row < moduleCount; row++) {
          const current = qrCode.isDark(row, col);
          if (row === 0) {
            head = current;
            sameCount = 1;
          } else {
            if (current === head) {
              sameCount++;
            } else {
              head = current;
              sameCount = 1;
            }
          }
          if (sameCount >= 5) {
            lostPoint += 3 + (sameCount - 5);
          }
        }
      }

      for (let row = 0; row < moduleCount - 1; row++) {
        for (let col = 0; col < moduleCount - 1; col++) {
          let count = 0;
          if (qrCode.isDark(row, col)) count++;
          if (qrCode.isDark(row + 1, col)) count++;
          if (qrCode.isDark(row, col + 1)) count++;
          if (qrCode.isDark(row + 1, col + 1)) count++;
          if (count === 0 || count === 4) {
            lostPoint += 3;
          }
        }
      }

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount - 6; col++) {
          if (
            qrCode.isDark(row, col) &&
            !qrCode.isDark(row, col + 1) &&
            qrCode.isDark(row, col + 2) &&
            qrCode.isDark(row, col + 3) &&
            qrCode.isDark(row, col + 4) &&
            !qrCode.isDark(row, col + 5) &&
            qrCode.isDark(row, col + 6)
          ) {
            lostPoint += 40;
          }
        }
      }

      for (let col = 0; col < moduleCount; col++) {
        for (let row = 0; row < moduleCount - 6; row++) {
          if (
            qrCode.isDark(row, col) &&
            !qrCode.isDark(row + 1, col) &&
            qrCode.isDark(row + 2, col) &&
            qrCode.isDark(row + 3, col) &&
            qrCode.isDark(row + 4, col) &&
            !qrCode.isDark(row + 5, col) &&
            qrCode.isDark(row + 6, col)
          ) {
            lostPoint += 40;
          }
        }
      }

      let darkCount = 0;
      for (let col = 0; col < moduleCount; col++) {
        for (let row = 0; row < moduleCount; row++) {
          if (qrCode.isDark(row, col)) {
            darkCount++;
          }
        }
      }

      const ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    }

    return {
      getBCHTypeInfo,
      getBCHTypeNumber,
      getPatternPosition,
      getMask,
      getErrorCorrectPolynomial,
      getLengthInBits,
      getLostPoint
    };
  })();

  const QRMath = (function () {
    const EXP_TABLE = new Array(256);
    const LOG_TABLE = new Array(256);

    for (let i = 0; i < 8; i++) {
      EXP_TABLE[i] = 1 << i;
    }
    for (let i = 8; i < 256; i++) {
      EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 255; i++) {
      LOG_TABLE[EXP_TABLE[i]] = i;
    }

    return {
      glog: function (n) {
        if (n < 1) {
          throw new Error('glog(' + n + ')');
        }
        return LOG_TABLE[n];
      },
      gexp: function (n) {
        while (n < 0) {
          n += 255;
        }
        while (n >= 256) {
          n -= 255;
        }
        return EXP_TABLE[n];
      }
    };
  })();

  function QRPolynomial(num, shift) {
    if (num.length === undefined) {
      throw new Error(num.length + '/' + shift);
    }
    let offset = 0;
    while (offset < num.length && num[offset] === 0) {
      offset++;
    }
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
  }

  QRPolynomial.prototype = {
    get: function (index) {
      return this.num[index];
    },
    getLength: function () {
      return this.num.length;
    },
    multiply: function (e) {
      const num = new Array(this.getLength() + e.getLength() - 1);
      for (let i = 0; i < this.getLength(); i++) {
        for (let j = 0; j < e.getLength(); j++) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
        }
      }
      return new QRPolynomial(num, 0);
    },
    mod: function (e) {
      if (this.getLength() - e.getLength() < 0) {
        return this;
      }
      const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
      const num = new Array(this.getLength());
      for (let i = 0; i < this.getLength(); i++) {
        num[i] = this.get(i);
      }
      for (let i = 0; i < e.getLength(); i++) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
      }
      return new QRPolynomial(num, 0).mod(e);
    }
  };

  function QRRSBlock(totalCount, dataCount) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }

  QRRSBlock.RS_BLOCK_TABLE = [
    [
      // L
      [1, 26, 19],
      [1, 44, 34],
      [1, 70, 55],
      [1, 100, 80],
      [1, 134, 108],
      [2, 86, 68],
      [2, 98, 78],
      [2, 121, 97],
      [2, 146, 116],
      [2, 86, 68, 2, 87, 69],
      [4, 101, 81],
      [2, 116, 92, 2, 117, 93],
      [4, 133, 107],
      [3, 145, 115, 1, 146, 116],
      [5, 109, 87, 1, 110, 88],
      [5, 122, 98, 1, 123, 99],
      [5, 135, 107, 1, 136, 108],
      [1, 150, 120, 5, 151, 121],
      [3, 141, 113, 4, 142, 114],
      [3, 135, 107, 5, 136, 108],
      [4, 144, 116, 4, 145, 117],
      [2, 139, 111, 7, 140, 112],
      [4, 151, 121, 5, 152, 122],
      [6, 147, 117, 4, 148, 118],
      [8, 132, 106, 4, 133, 107],
      [10, 142, 114, 2, 143, 115],
      [8, 152, 122, 4, 153, 123],
      [3, 147, 117, 10, 148, 118],
      [7, 146, 116, 7, 147, 117],
      [5, 145, 115, 10, 146, 116],
      [13, 145, 115, 3, 146, 116],
      [17, 145, 115],
      [17, 145, 115, 1, 146, 116],
      [13, 145, 115, 6, 146, 116],
      [12, 151, 121, 7, 152, 122],
      [6, 151, 121, 14, 152, 122],
      [17, 152, 122, 4, 153, 123],
      [4, 152, 122, 18, 153, 123],
      [20, 147, 117, 4, 148, 118],
      [19, 148, 118, 6, 149, 119]
    ],
    [
      // M
      [1, 26, 16],
      [1, 44, 28],
      [1, 70, 44],
      [2, 50, 32],
      [2, 67, 43],
      [4, 43, 27],
      [2, 32, 24, 4, 33, 25],
      [4, 39, 31],
      [2, 32, 24, 4, 33, 25],
      [4, 43, 27, 1, 44, 28],
      [1, 50, 30, 4, 51, 31],
      [2, 60, 36, 2, 61, 37],
      [2, 44, 28, 4, 45, 29],
      [3, 52, 32, 5, 53, 33],
      [5, 37, 24, 5, 38, 25],
      [5, 41, 26, 5, 42, 27],
      [1, 45, 28, 5, 46, 29],
      [5, 43, 26, 7, 44, 27],
      [3, 44, 26, 7, 45, 27],
      [3, 41, 26, 9, 42, 27],
      [4, 45, 26, 5, 46, 27],
      [2, 42, 26, 7, 43, 27],
      [4, 46, 26, 4, 47, 27],
      [6, 43, 26, 6, 44, 27],
      [8, 44, 26, 4, 45, 27],
      [10, 41, 26, 2, 42, 27],
      [8, 43, 26, 4, 44, 27],
      [3, 45, 26, 10, 46, 27],
      [7, 45, 26, 7, 46, 27],
      [5, 45, 26, 10, 46, 27],
      [13, 45, 26, 3, 46, 27],
      [17, 45, 26],
      [17, 45, 26, 1, 46, 27],
      [13, 45, 26, 6, 46, 27],
      [12, 47, 26, 7, 48, 27],
      [6, 47, 26, 14, 48, 27],
      [17, 46, 26, 4, 47, 27],
      [4, 47, 26, 18, 48, 27],
      [20, 45, 25, 4, 46, 26],
      [19, 46, 26, 6, 47, 27]
    ],
    [
      // Q
      [1, 26, 13],
      [1, 44, 22],
      [2, 35, 17],
      [2, 50, 24],
      [2, 33, 15, 2, 34, 16],
      [4, 43, 19],
      [2, 32, 14, 4, 33, 15],
      [4, 40, 18],
      [4, 36, 16, 2, 37, 17],
      [4, 44, 20, 2, 45, 21],
      [6, 36, 16, 2, 37, 17],
      [4, 47, 20, 4, 48, 21],
      [4, 45, 19, 4, 46, 20],
      [4, 46, 19, 6, 47, 20],
      [6, 43, 19, 2, 44, 20],
      [8, 47, 20, 1, 48, 21],
      [10, 43, 19, 2, 44, 20],
      [9, 43, 19, 4, 44, 20],
      [3, 44, 19, 11, 45, 20],
      [3, 41, 19, 13, 42, 20],
      [17, 42, 19],
      [17, 46, 19],
      [4, 47, 19, 14, 48, 20],
      [6, 45, 19, 14, 46, 20],
      [8, 47, 19, 13, 48, 20],
      [19, 46, 19, 4, 47, 20],
      [22, 45, 19, 3, 46, 20],
      [3, 45, 19, 23, 46, 20],
      [21, 45, 19, 7, 46, 20],
      [19, 47, 19, 10, 48, 20],
      [2, 46, 19, 29, 47, 20],
      [10, 46, 19, 23, 47, 20],
      [14, 46, 19, 21, 47, 20],
      [14, 46, 19, 23, 47, 20],
      [12, 47, 19, 26, 48, 20],
      [6, 47, 19, 34, 48, 20],
      [29, 46, 19, 14, 47, 20],
      [13, 46, 19, 32, 47, 20],
      [40, 47, 19, 7, 48, 20],
      [18, 47, 19, 31, 48, 20]
    ],
    [
      // H
      [1, 26, 9],
      [1, 44, 16],
      [2, 35, 13],
      [2, 50, 9],
      [2, 33, 11, 2, 34, 12],
      [4, 43, 15],
      [4, 39, 13],
      [4, 40, 14],
      [4, 36, 12, 4, 37, 13],
      [4, 44, 16, 2, 45, 17],
      [6, 36, 12, 2, 37, 13],
      [4, 47, 14, 4, 48, 15],
      [8, 45, 13, 1, 46, 14],
      [11, 45, 13, 1, 46, 14],
      [5, 43, 13, 5, 44, 14],
      [7, 45, 15, 3, 46, 16],
      [15, 43, 15, 2, 44, 16],
      [1, 45, 15, 15, 46, 16],
      [17, 45, 15],
      [17, 47, 15],
      [15, 54, 15, 4, 55, 16],
      [17, 50, 15, 6, 51, 16],
      [7, 54, 15, 16, 55, 16],
      [11, 54, 15, 14, 55, 16],
      [11, 54, 15, 16, 55, 16],
      [7, 54, 15, 22, 55, 16],
      [28, 50, 15, 6, 51, 16],
      [8, 53, 15, 26, 54, 16],
      [4, 54, 15, 31, 55, 16],
      [1, 53, 15, 37, 54, 16],
      [15, 55, 15, 25, 56, 16],
      [42, 54, 15, 1, 55, 16],
      [10, 54, 15, 35, 55, 16],
      [29, 54, 15, 19, 55, 16],
      [44, 54, 15, 7, 55, 16],
      [39, 54, 15, 14, 55, 16],
      [46, 54, 15, 10, 55, 16],
      [49, 54, 15, 10, 55, 16],
      [48, 54, 15, 14, 55, 16],
      [43, 54, 15, 22, 55, 16]
    ]
  ];

  QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectLevel) {
    const rsBlock = QRRSBlock.RS_BLOCK_TABLE[errorCorrectLevel][typeNumber - 1];
    if (!rsBlock) {
      throw new Error('bad rs block @ typeNumber:' + typeNumber + '/errorCorrectLevel:' + errorCorrectLevel);
    }

    const list = [];

    for (let i = 0; i < rsBlock.length / 3; i++) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];

      for (let j = 0; j < count; j++) {
        list.push(new QRRSBlock(totalCount, dataCount));
      }
    }

    return list;
  };

  function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
  }

  QRBitBuffer.prototype = {
    get: function (index) {
      const bufIndex = Math.floor(index / 8);
      return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
    },
    put: function (num, length) {
      for (let i = 0; i < length; i++) {
        this.putBit(((num >>> (length - i - 1)) & 1) === 1);
      }
    },
    putBit: function (bit) {
      const bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) {
        this.buffer.push(0);
      }
      if (bit) {
        this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
      }
      this.length++;
    }
  };

  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }

  QRCodeModel.prototype = {
    addData: function (data) {
      const newData = new QR8bitByte(data);
      this.dataList.push(newData);
      this.dataCache = null;
    },
    isDark: function (row, col) {
      if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
        throw new Error(row + ',' + col);
      }
      return this.modules[row][col];
    },
    getModuleCount: function () {
      return this.moduleCount;
    },
    make: function () {
      if (this.typeNumber < 1) {
        this.typeNumber = 1;
      }
      this.makeImpl(false, this.getBestMaskPattern());
    },
    makeImpl: function (test, maskPattern) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (let row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount);
        for (let col = 0; col < this.moduleCount; col++) {
          this.modules[row][col] = null;
        }
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);

      if (this.typeNumber >= 7) {
        this.setupTypeNumber(test);
      }

      if (this.dataCache === null) {
        this.dataCache = this.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
      }

      this.mapData(this.dataCache, maskPattern);
    },
    setupPositionProbePattern: function (row, col) {
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          if (0 <= r && r <= 6 && (c === 0 || c === 6)) {
            this.modules[row + r][col + c] = true;
          } else if (0 <= c && c <= 6 && (r === 0 || r === 6)) {
            this.modules[row + r][col + c] = true;
          } else if (1 <= r && r <= 5 && 1 <= c && c <= 5) {
            this.modules[row + r][col + c] = (r === 1 || r === 5 || c === 1 || c === 5);
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    setupTimingPattern: function () {
      for (let r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] !== null) continue;
        this.modules[r][6] = r % 2 === 0;
      }
      for (let c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] !== null) continue;
        this.modules[6][c] = c % 2 === 0;
      }
    },
    setupPositionAdjustPattern: function () {
      const pos = QRUtil.getPatternPosition(this.typeNumber);
      for (let i = 0; i < pos.length; i++) {
        for (let j = 0; j < pos.length; j++) {
          const row = pos[i];
          const col = pos[j];
          if (this.modules[row][col] !== null) continue;
          for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
              if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
                this.modules[row + r][col + c] = true;
              } else {
                this.modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    },
    setupTypeNumber: function (test) {
      const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
      for (let i = 0; i < 18; i++) {
        const mod = !test && ((bits >>> i) & 1) === 1;
        this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
        this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    },
    setupTypeInfo: function (test, maskPattern) {
      const data = (QRErrorCorrectLevel[this.errorCorrectLevel] << 3) | maskPattern;
      const bits = QRUtil.getBCHTypeInfo(data);
      for (let i = 0; i < 15; i++) {
        const mod = !test && ((bits >>> i) & 1) === 1;
        if (i < 6) {
          this.modules[i][8] = mod;
        } else if (i < 8) {
          this.modules[i + 1][8] = mod;
        } else {
          this.modules[this.moduleCount - 15 + i][8] = mod;
        }
        const j = this.moduleCount - 1 - i;
        if (i < 8) {
          this.modules[8][j] = mod;
        } else if (i < 9) {
          this.modules[8][15 - i - 1] = mod;
        } else {
          this.modules[8][15 - i] = mod;
        }
      }
      this.modules[this.moduleCount - 8][8] = !test;
    },
    mapData: function (data, maskPattern) {
      let inc = -1;
      let row = this.moduleCount - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (this.modules[row][col - c] === null) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
              }
              if (QRUtil.getMask(maskPattern, row, col - c)) {
                dark = !dark;
              }
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    },
    getBestMaskPattern: function () {
      let minLostPoint = 0;
      let pattern = 0;
      for (let i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        const lostPoint = QRUtil.getLostPoint(this);
        if (i === 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }
      return pattern;
    },
    createData: function (typeNumber, errorCorrectLevel, dataList) {
      const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
      const buffer = new QRBitBuffer();

      dataList.forEach(data => {
        buffer.put(QRMode.MODE_8BIT_BYTE, 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(QRMode.MODE_8BIT_BYTE, typeNumber));
        data.write(buffer);
      });

      let totalDataCount = 0;
      rsBlocks.forEach(block => {
        totalDataCount += block.dataCount;
      });

      if (buffer.length > totalDataCount * 8) {
        throw new Error('code length overflow.');
      }

      if (buffer.length + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      while (buffer.length % 8 !== 0) {
        buffer.putBit(false);
      }

      const totalCodeCount = rsBlocks.reduce((sum, block) => sum + block.totalCount, 0);
      const dataBytes = new Array(totalCodeCount);

      const data = buffer.buffer.slice();
      let padIndex = 0;
      while (data.length < totalDataCount) {
        data.push(padIndex % 2 === 0 ? PAD0 : PAD1);
        padIndex++;
      }

      let offset = 0;
      rsBlocks.forEach(block => {
        const dcCount = block.dataCount;
        const ecCount = block.totalCount - dcCount;

        const dataCache = new Array(dcCount);
        for (let i = 0; i < dcCount; i++) {
          const value = data.shift();
          dataCache[i] = (value === undefined ? 0 : value) & 0xff;
        }

        const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        const rawPoly = new QRPolynomial(dataCache, 0);
        const modPoly = rawPoly.mod(rsPoly);

        const ecData = new Array(ecCount);
        for (let i = 0; i < ecCount; i++) {
          const modIndex = i + modPoly.getLength() - ecCount;
          ecData[i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
        }

        for (let i = 0; i < dcCount; i++) {
          dataBytes[offset + i] = dataCache[i];
        }
        for (let i = 0; i < ecCount; i++) {
          dataBytes[offset + dcCount + i] = ecData[i];
        }
        offset += block.totalCount;
      });

      return dataBytes;
    }
  };

  function create(typeNumber, errorCorrectLevel) {
    return new QRCodeModel(typeNumber, errorCorrectLevel);
  }

  const CAPACITY_BYTE_MODE_M = [
    0,
    14, 26, 42, 62, 84, 106, 122, 152, 180, 213,
    251, 287, 331, 362, 412, 450, 504, 560, 624,
    666, 711, 779, 857, 911, 997, 1059, 1125, 1190,
    1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911,
    1989, 2099, 2213, 2331
  ];

  function getTypeNumberFromLength(length) {
    for (let type = 1; type < CAPACITY_BYTE_MODE_M.length; type++) {
      if (length <= CAPACITY_BYTE_MODE_M[type]) {
        return type;
      }
    }
    return CAPACITY_BYTE_MODE_M.length - 1;
  }

  function generate(data, options = {}) {
    const { errorCorrection = 'M' } = options;
    const typeNumber = getTypeNumberFromLength(data.length * 8);
    const qr = create(typeNumber, errorCorrection);
    qr.addData(data);
    qr.make();
    return qr;
  }

  function renderSvgPath(qr, margin = 4) {
    const size = qr.getModuleCount() + margin * 2;
    let path = '';
    for (let row = 0; row < qr.getModuleCount(); row++) {
      for (let col = 0; col < qr.getModuleCount(); col++) {
        if (qr.isDark(row, col)) {
          const x = col + margin;
          const y = row + margin;
          path += `M${x},${y} h1 v1 h-1 Z`;
        }
      }
    }
    return { path, size };
  }

  function createSvg(data, options = {}) {
    const qr = generate(data, options);
    const scale = options.scale || 4;
    const margin = options.margin || 4;
    const { path, size } = renderSvgPath(qr, margin);
    const dimension = size * scale;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${dimension}" height="${dimension}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
      <rect width="100%" height="100%" fill="${options.background || '#ffffff'}" />
      <path d="${path}" fill="${options.color || '#000000'}"/>
    </svg>`;
  }

  return { createSvg };
})();

export function createQrSvg(content, options = {}) {
  return QRCode.createSvg(content, options);
}
