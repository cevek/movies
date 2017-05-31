import { execSync } from 'child_process';
import { tmpdir } from "os";
import { writeFileSync, readFileSync } from "fs";

function getTmpFileName(ext: string) {
    return tmpdir() + '/' + Math.random().toString(33).substr(2, 5) + '.' + ext;
}
export function aligner(mediaFile: string, text: string) {
    var txtName = tmpdir() + '/temp43dT456.txt';
    writeFileSync(txtName, text);
    var wavName = tmpdir() + '/temp43dT456.wav';
    console.log('start');

    execSync(`ffmpeg -y -i ${mediaFile} -ac 1 -ar 16000 ${wavName}`);
    console.log('converted');
    var sphinxDir = `${__dirname}/sphinx`;
    // var result = execSync(`java -cp ${sphinxDir}/sphinx4.jar edu.cmu.sphinx.demo.aligner.AlignerDemo ${wavName} ${txtName} ${sphinxDir}/models/en-us/en-us ${sphinxDir}/models/en-us/cmudict-en-us.dict`);
    var result = JSON.parse(readFileSync(__dirname + '/align.json', 'utf8')).join('\n') as string;
    var lines = result.toString().trim().split(/\n/).filter(line => !line.startsWith('+ '));
    // console.log(lines);
    var words = wordSplitter(text);
    // console.log(words);

    if (lines.length !== words.length) {
        throw new Error(`something wrong: ${JSON.stringify(words)}, ${JSON.stringify(lines)}`);
    }
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        var m = line.match(/^(?:- |  )([^ ]+)(?:\s+\[(\d+):(\d+)\])?$/);
        if (!m) {
            throw new Error(`empty result: ${JSON.stringify(line)}`);
        }
        var word = words[i];
        if (word.normalized !== m[1]) {
            throw new Error(`something wrong: ${JSON.stringify(word.normalized)} !== ${JSON.stringify(m[1])}`);
        }
        word.start = m[2] === void 0 ? null : +m[2] / 1000;
        word.end = m[2] === void 0 ? null : +m[3] / 1000;
    }
    // console.log(words);
    return words;
}

function POSTagger(text: string): [string, string][] {
    text = text.replace(/\s/g, ' ').replace(/[`’]/g, "'").replace(/[^\d\w\-,.!?:;' ]+/g, ' ');
    console.log("text", text);

    var result = execSync(`PYTHONPATH="$PYTHONPATH:/usr/local/lib/python2.7/site-packages" python ${__dirname}/../sentenceparser/parser.py ${Buffer.from(text).toString('base64')}`).toString();
    return JSON.parse(result);
}

interface Word {
    normalized: string;
    original: string;
    start: number | null;
    end: number | null;
    partsOfSpeech: string[];
}
function wordSplitter(text: string) {
    // aa:bb;cc.dd?ee!ff#gg^hh&kk*ll"mm'qq№jj,zz[dd]ss\\rr|hh/tt=ss+uu(oo)hh–jj—ff—pp\`hh<gg~hh>yy±jj§uu{dd}@gg¦«dd¬ee®rr¯rr°hh±hh¶hh»yy¼rr‘ee’tt‚gg“jj”hh¨jj„ff†jj‡hh•jj…jj‰rr€jj™44,ee
    // [[ [ ] ]] 11 1 @@ @ ## # $$ $ -- - %% % ^^ ^ && & {{ { } }} ~~ ~ \`\` \` << < > >> '' ' "" " ** * \\ || | == = ++ +  ## #
    var parts = text.split(/([.,!?:;*"/()——«»…”“‘\s]+)/);
    var words: Word[] = [];
    for (let i = 0; i < parts.length; i += 2) {
        var original = i + 1 < parts.length ? (parts[i] + parts[i + 1]) : parts[i];
        var normalized = parts[i].replace(/%/g, '').toLowerCase();
        if (normalized == '') continue;
        var prevWord = words.length > 0 ? words[words.length - 1] : null;
        if (prevWord && /^(-|%+)$/.test(prevWord.normalized)) {
            prevWord.original += original;
            prevWord.normalized = normalized;
        } else {
            words.push({ normalized, original, start: null, end: null, partsOfSpeech: [] });
        }
    }
    return words;
}

function mergePOSResultWithWords(pos: [string, string][], words: Word[]) {
    var symbols: { s: string, tag: string }[] = [];
    for (let i = 0; i < pos.length; i++) {
        const [w, tag] = pos[i];
        for (let i = 0; i < w.length; i++) {
            if (/\w/.test(w[i])) {
                symbols.push({ s: w[i], tag });
            }
        }
    }

    let sI = 0;
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        for (let j = 0; j < word.original.length; j++) {
            const s = word.original[j];
            var lastPOS = word.partsOfSpeech.length > 0 ? word.partsOfSpeech[word.partsOfSpeech.length - 1] : null;
            if (/\w/.test(s)) {
                if (s !== symbols[sI].s) {
                    throw new Error(`something wrong`);
                }
                if (lastPOS !== symbols[sI].tag) {
                    word.partsOfSpeech.push(symbols[sI].tag);
                }
                sI++;
            }
        }
    }
}


var text = `
As Sundar and Dave
said, with two billion active devices on Android
and 82 billion apps installed from Play,
Android's momentum is amazing.
What I like even more is how Android's momentum is making
so many developers successful.
The number of developers with over a million installs
grew 35% just in the past year.
And we're making it easier to grow revenue, too.
In addition to credit cards, gift cards, everything else,
we've expanded direct carrier billing
to reach 900 million devices with over 140 operators.
Altogether, the number of people buying on Play
grew by almost 30% in the past year.
Now, to support this vast ecosystem
we're working hard to help developers build
great apps at every stage--
writing your app, tuning, and growing your business.
Today, we'll walk through four big themes.
The first is languages.
[CHEERING AND APPLAUSE]
Next is making Android development faster and easier
with the IDE and Libraries.
Third, we'll show you even more tools for building
high-quality experiences.
Finally, we want to help you grow and reach new users,
leveraging Android Instant Apps.
So let's go straight in.
We have been so excited to announce first-class support
for Kotlin.
[APPLAUSE]
This starts now.
In Android Studio, Kotlin support is now built-in.
We'll support building apps with as much Kotlin
as you want, from zero to 100 percent.
Now, all of you who've written code in Kotlin
know why we did this already.
But for everyone, we did it because Kotlin
is a beautiful programming language.
We asked one Googler how he felt after writing
Kotlin for a couple of weeks.
While I would never embarrass Adam Powell
by using his name on stage, he said, &quot;I think I am in love.&quot;
[LAUGHTER]
So, many of you told me Kotlin makes programming fun again,
with so many wonderful features like you're going to see here.
And Tor will show you more in just a moment.
As developers, languages are the tools
we use to express our thoughts.
With Kotlin, there's just so much less syntactic noise
that stands between what I want to say and how I say it.
Now, for those of you who are wondering what this may mean
for the Java programming language and C++,
our commitment there is unchanged.
We're adding Kotlin and enhancing our existing
languages.
For instance, in Android Studio, Java 8 features
are now directly supported with the Java C compiler
and we've added more Java 8 Language APIs in O.
So if you wish, you can ignore Kotlin completely
and your existing language support
will keep getting better.
But if you can't wait to get started with Kotlin,
it is incredibly easy.
Kotlin works 100% with the Java programming language,
which means it is completely interoperable.
That means you can keep every line of code
in your existing project.
You can seamlessly call from Kotlin
into the Java programming language and back, which means
it is very easy to get started.
You can add as little as a single Kotlin class.
Another reason why Kotlin is such an amazing fit for Android
is it's mature and production-ready.
Kotlin has been around for five years
and major apps like Flipboard, Pinterest, Square Cash,
Expedia, and more are all using Kotlin in production.
Now, Kotlin's not just a great language.
It has outstanding IDE support.
The team that brought you Kotlin is the same team
behind IntelliJ which, as you know,
is what powers Android Studio, our IDE.
Finally, Android has committed to Kotlin
as a first-class language, and, as you heard,
we're announcing our plans to partner with JetBrains
to move Kotlin into a nonprofit foundation.
Kotlin is already open-source under Apache 2, which means it
is open and will remain open.
We love how Kotlin fits with our ethos around community.
And now, Tor would love to show you Kotlin in action.
So, Tor.
[CHEERING AND APPLAUSE]
TOR NORBYE: Thanks, Steph.
So here's a pretty typical data class with three properties
implemented in Java.
As you can see, there is a lot of boilerplate code
here with fields, scatters, setters, equals,
hashCode, and so on.
Let's take a look at how we would implement this in Kotlin.
So I'm going to go ahead and delete this class,
and now I'm going to write the equivalent Kotlin code.
So here's the first line, and that is also the last line.
That is all you have to write.
This code--
[LAUGHTER]
[CHEERING AND APPLAUSE]
This code is completely equivalent to the 87 lines
I just deleted.
The compiler does all the work.
It generates the same code as before,
plus some extra goodies.
So from Java, I can call into my new Kotlin class
and access the same getters as before.
But look what happens in Kotlin.
Here we have a really nice property syntax.
So I can, for example, use assignment
to assign to this property instead of calling a setter.
Now, as you're starting out with Kotlin,
you might find yourself stuck, realizing you
don't know how to do something.
So let's say that I'm about to do some image processing
and I realize that I don't know how to declare
a two-dimensional array.
Well, what I can do is open up a Java file,
write the code in Java, which I know how to do,
go back to Kotlin, and look what happens when I paste.
That's right.
The IDE converts it for me.
[APPLAUSE]
That is a huge help when you're starting out.
So as Steph can attest, I could literally stand for three hours
and tell you all the things I love about Kotlin.
And I think I have.
STEPHANIE SAAD CUTHBERTSON: Yes.
TOR NORBYE: But we don't have time for that.
So instead, I will encourage you all
to come to our excellent talks on Friday, where
you'll learn everything you need to know
to get started with Kotlin.
And I hope you'll love coding in Kotlin as much as I do.
STEPHANIE SAAD CUTHBERTSON: Thanks, Tor.
TOR NORBYE: Thanks.
[APPLAUSE]
STEPHANIE SAAD CUTHBERTSON: For us at Android,
adding Kotlin feels like a moment in history.
We are excited today.
It's just the beginning, though.
We're even more excited about the possibilities
that Kotlin creates for the future.
But there's more.
Our second theme is making development faster and easier
with our tools and libraries.
Android studios are official IDE.
It is purpose-built for Android, and we
keep increasing investment.
Today, we're releasing Android Studio 3.0's first Canary,
focusing on speed and smarts, and Android platform support,
plus new libraries for app architecture.
So let's go straight to a demo.
It's more fun.
All right.
So here I have Android Studio 3.0,
and I've just built and deployed my app.
And what you'll see are the new profilers--
CPU, memory, and network.
So I'm just going to open the app.
And let me do a little bit of network
here so you can see it on the graph.
What you can see is the network profiler,
and it's really cool that you can see all of the requests,
but particularly cool would be if you could click and see
the actual payload of the request.
Even better than that would be if you could look and see
the headers, but I actually think
it would be very cool if you could click on the call stack
and select and go to the line of code.
[APPLAUSE]
So those are the three new profilers.
3.0 also includes a preview feature
for debugging any APK, so you can build in any IDE
and debug in Android Studio, including using
these profilers for Java code.
So to say more on speed and smarts,
your feedback has made driving down sync
and build time our number one priority.
Benchmarking with a real life, 100 module project since 2.2,
the build config time has dropped
from three seconds down--
sorry-- from three minutes down to two seconds.
And we will keep working on build speed.
On the emulators, we've added Play Store for Android testing.
And there's so much more here.
The next thing I want to talk about
is Android platform support.
You will find awesome features for Android and O,
like end-to-end instant app support, O system images,
and tons of helper tools.
For instance, Dave talked about adaptive icons, which we all
need to build now, so our team has built
tools that make that easy.
And one of my personal favorite features
is, to download Android dependencies for build,
you don't have to go through the Android SDK manager anymore.
We're now distributing through our own Maven repository.
[CHEERING AND APPLAUSE]
Finally, you have asked us to make Android Frameworks easier,
like providing an opinionated guide
to best practices or a better way of dealing with lifecycles.
We're launching a preview of new Architecture Components,
libraries for common tasks.
This starts with libraries for the ViewModel pattern,
Data Storage, and managing activity and fragment
lifecycles.
We would love if you'd download and try all of this today.
Now, as we move from coding over into how to tune your quality
and grow, I'd like you to hear from Ellie Powers.
`



// console.log(wordSplitter(text));

// var words = wordSplitter(text);
// var pos = POSTagger(text);

// var xx = pos.reduce((s, [w, x]) => s + w.replace(/\W+/g, ''), '');
// var ddd = text.replace(/\W+/g, '');
// console.log(xx + '\n\n');
// console.log(ddd);
// console.log(xx === ddd);

// mergePOSResultWithWords(pos, words);


// console.log(words.filter(w => w.partsOfSpeech.length > 1));

var result = aligner('/Users/cody/downloads/io1.mp3', text);
writeFileSync(__dirname + '/result.ts', 'export default ' + JSON.stringify(result, null, 2));
