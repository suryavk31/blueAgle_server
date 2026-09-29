const { Sequelize, DataTypes } = require('sequelize');

const seq = new Sequelize('blueeagle', 'root', 'Suriya@99', { dialect: 'mysql', logging: false });

const parseArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const parseObject = (val) => {
    if (!val) return {};
    if (typeof val === 'object' && !Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            return (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : {};
        } catch {
            return {};
        }
    }
    return {};
};

console.log("parseArray null:", parseArray(null));
console.log("parseArray empty string:", parseArray(""));
console.log("parseArray array:", parseArray(["a", "b"]));
console.log("parseArray valid json str:", parseArray('["a", "b"]'));
console.log("parseArray malformed:", parseArray('[abc'));
console.log("parseArray primitive:", parseArray(123));

console.log("parseObject null:", parseObject(null));
console.log("parseObject empty string:", parseObject(""));
console.log("parseObject object:", parseObject({ a: 1 }));
console.log("parseObject valid json str:", parseObject('{"a": 1}'));
console.log("parseObject malformed:", parseObject('{abc'));
console.log("parseObject array:", parseObject([1, 2]));
console.log("parseObject primitive:", parseObject(123));
