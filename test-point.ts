import { autoPointPsalm } from './components/psalm-utils';

const text = `Blessed indeed is the man
who follows not the counsel of the wicked;
lingers not in the way of sinners
nor sits in the company of scorners,
but whose delight is the law of the Lord
and who ponders his law day and night.`;
console.log(autoPointPsalm(text, 3));
