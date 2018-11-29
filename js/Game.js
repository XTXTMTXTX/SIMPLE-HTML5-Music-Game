"use strict";
let preTime=2000;
let time=0;
let content;
let TPnums=0;
let BPMnums=0;
let BPMs={};
let Objs={};
let HOnums=0;
let scrollDuration=500;
let MpB=0;
let baseMpB=0;
let percent=100;
let BpB=4;
let measure=BpB*MpB;
let p=0;
let noteThick=60;
let LineQueue=[{},{},{},{}],LineQueueTail=[0,0,0,0],LineQueueHead=[0,0,0,0];
let timing=[16,37,70,100,123,161];
let audio1=document.getElementById("audioPlayer");
let keyAsync=[false,false,false,false];
let keyLaserTime=[0,0,0,0];
let JudgeTime=500;
let JudgeNew=0;
let JudgeType=0;
let FSType=false;
let LN=0;
let Score=0,EndScore=0;
let Combo=0;
let LineHold=[-1,-1,-1,-1];
let LaserTime=150;
let offset=-40;
let Result=[0,0,0,0,0,0,0];
let FastCount=0,SlowCount=0,MaxCombo=0;
const bindKey=[68,70,74,75];
let c=document.getElementById("myCanvas");
let ctx=c.getContext("2d");
let linear = ctx.createLinearGradient(75,850,75,500);
linear.addColorStop(0,"#9ED3FF");
linear.addColorStop(1,"rgba(0,0,0,0)");
function parseOsuString(data) {
    let regex = {
        section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
        param: /^\s*([\w.\-_]+)\s*:\s*(.*?)\s*$/,
        param2: /^\s*([?.\-\d]+)\s*,\s*([?.\-\d]+)\s*,\s*([?.\-\d]+)\s*,\s*([?.\-\d]+)\s*,\s*([?.\-\d]+)\s*,\s*([?.\-\d]+)\s*,\s*([?.\-\d]+)\s*,\s*([?.\-\d]+)\s*$/,
        param3: /^\s*([?.\-\d]+)\s*,\s*([?.\-\d]+)\s*,\s*([?.\-\d]+)\s*,\s*([?.\-\d]+)\s*,\s*([?.\-\d]+)\s*,\s*([?.\-\d]+)\s*/,
        comment: /^\s*\/\/.*$/
    };
    let value = {};
    let lines = data.split(/\r\n|\r|\n/);
    let section = null;
    lines.forEach(function(line){
        if(regex.comment.test(line)){
            return;
        }else if(regex.param.test(line)){
            let match = line.match(regex.param);
            if(section){
                value[section][match[1]] = match[2];
            }else{
                value[match[1]] = match[2];
            }
        }else if(regex.param2.test(line)){
            let match = line.match(regex.param2);
            value[section][TPnums]={};
            for(let i=0;i<8;i++)
                if(section){
                    value[section][TPnums][i] = Number(match[1+i]);
                }
            TPnums++;
        }else if(regex.param3.test(line)){
            let match = line.match(regex.param3);
            value[section][HOnums]={};
            for(let i=0;i<6;i++)
                if(section){
                    value[section][HOnums][i] = Number(match[1+i]);
                }
            HOnums++;
        }else if(regex.section.test(line)){
            let match = line.match(regex.section);
            value[match[1]] = {};
            section = match[1];
        }else if(line.length === 0 && section){
            section = null;
        };
    });
    return value;
}
window.requestAnimFrame = (function (callback) {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimaitonFrame ||
        function (callback) {
            window.setTimeout(callback, 1000/60);
        };
})();
document.ontouchmove = function (e) {
    e.preventDefault();
    return false;
}
function startTime() {
    if(preTime>0){
        time=-preTime+offset;
        draw();
        preTime-=5;
        setTimeout(startTime,5);
        return;
    }
    if(preTime===0){
        audio1.play();
        preTime=-1;
    }
    if(audio1.ended){
        removeKeyListener();
        EndingScene();
    }
    if(audio1.ended||audio1.paused)return;
    time=audio1.currentTime * 1000+offset;
    while(p<TPnums-1&&time>=content["TimingPoints"][p+1][0])p++;
    draw();
    if(!(audio1.ended||audio1.paused))requestAnimFrame(startTime);

}
function readOsu() {
    let localFile = document.getElementById("uploadOsu").files[0];
    let reader = new FileReader();
    reader.onload = function (f) {
        document.getElementById("osudiv").setAttribute("style","display:none;");
        document.getElementById("audiodiv").setAttribute("style","text-align: center; position: absolute; margin: auto; top: 0; left: 0; right: 0; bottom: 0; height: 0px;");
        content = this.result;
        content = parseOsuString(content);
        for(let i=0;i<TPnums;i++)if(content["TimingPoints"][i][1]<0)content["TimingPoints"][i][8]=BPMnums-1;else{
            content["TimingPoints"][i][8]=BPMnums;
            BPMs[BPMnums]={};
            BPMs[BPMnums][0]=content["TimingPoints"][i][0];
            BPMs[BPMnums][1]=content["TimingPoints"][i][1];
            BPMs[BPMnums][2]=content["TimingPoints"][i][2];
            BPMnums++;
        }
        for(let i=0;i<HOnums;i++){
            Objs[i]={};
            Objs[i]["Key"]=Math.floor(content["HitObjects"][i][0]/(512/4));
			if(Objs[i]["Key"]>=4)Objs[i]["Key"]=3;
            Objs[i]["StartTime"]=content["HitObjects"][i][2];
            Objs[i]["EndTime"]=content["HitObjects"][i][5];
            if(Objs[i]["EndTime"]>0)LN++;
            Objs[i]["Available"]=true;
            LineQueue[Objs[i]["Key"]][LineQueueTail[Objs[i]["Key"]]++]=i;
        }
        EndScore=(LN+HOnums)*5;
    }
    reader.onerror = function (event) {
        alert("error");
    }
    reader.readAsText(localFile, "UTF-8");
}
function readAudio() {
    let localFile = document.getElementById("uploadAudio").files[0];
    let reader = new FileReader();
    let content;
    reader.onload = function (event) {
        content = event.target.result;
        audio1.src = content;
        audio1.play();
        audio1.pause();
        document.getElementById("audiodiv").setAttribute("style","display: none;");
        document.getElementById("startdiv").setAttribute("style","text-align: center; position: absolute; margin: auto; top: 0; left: 0; right: 0; bottom: 0; height: 0px;");
    }
    reader.onerror = function (event) {
        alert("error");
    }
    content = reader.readAsDataURL(localFile);
}
function initKeyListener() {
    window.addEventListener("keydown",processKeydown, true);
    window.addEventListener("keyup", processKeyup, true);
}
function removeKeyListener() {
    window.removeEventListener("keydown",processKeydown, true);
    window.removeEventListener("keyup", processKeyup, true);
}
function calcPOS(tt) {
    let p1=p;
    while(p1>0&&tt<content["TimingPoints"][p1][0])p1--;
    tt=Number(tt);
    let tpos=0;
    let pos=0;
    let MpB=0;
    let c=0;
    for(let i=p1;i<TPnums;i++){
        MpB=BPMs[content["TimingPoints"][i][8]][1];
        if(content["TimingPoints"][i][1]>0)percent=1;else percent=-content["TimingPoints"][i][1]/100;
        if(i===TPnums-1||content["TimingPoints"][i+1][0]>time)
            c=(time-content["TimingPoints"][i][0])*800/(scrollDuration*MpB*percent/baseMpB);
        else
            c=(content["TimingPoints"][i+1][0]-content["TimingPoints"][i][0])*800/(scrollDuration*MpB*percent/baseMpB);
        tpos=tpos+c;
        if(i===TPnums-1||content["TimingPoints"][i+1][0]>time)break;
    }
    for(let i=p1;i<TPnums;i++){
        MpB=BPMs[content["TimingPoints"][i][8]][1];
        if(content["TimingPoints"][i][1]>0)percent=1;else percent=-content["TimingPoints"][i][1]/100;
        if(i===TPnums-1||content["TimingPoints"][i+1][0]>tt)
            c=(tt-content["TimingPoints"][i][0])*800/(scrollDuration*MpB*percent/baseMpB);
        else
            c=(content["TimingPoints"][i+1][0]-content["TimingPoints"][i][0])*800/(scrollDuration*MpB*percent/baseMpB);
        pos=pos+c;
        if(i===TPnums-1||content["TimingPoints"][i+1][0]>tt)break;
    }

    return Number(pos-tpos);
}
function bt_start_onclick() {
    document.getElementById("startdiv").setAttribute("style","display: none;");
    document.getElementById("canvasdiv").setAttribute("style","width: 600px; margin:0 auto;");
    scrollDuration=Number(document.getElementById("scrollDurationInput").value);
    offset=Number(document.getElementById("inputOffset").value);
    if(document.getElementById("baseBPM").value!=="")baseMpB=60000/Number(document.getElementById("baseBPM").value);else{
        baseMpB=Number(content["TimingPoints"][0][1]);
        for(let i=1;i<TPnums;i++)if(Number(content["TimingPoints"][i][1])>0)baseMpB=(baseMpB<Number(content["TimingPoints"][i][1])?baseMpB:Number(content["TimingPoints"][i][1]));
    }
    initKeyListener();
    startTime();
}
function MissEvent(early) {
    Combo=0;
    FSType=early;
    JudgeType=6;
    Result[6]++;
    JudgeNew=time+JudgeTime;
    if(early)FastCount++;else SlowCount++;
}
function HitEvent(Key, number, early) {
    if(number<5)Combo++;else Combo=0;
    if(Combo>MaxCombo)MaxCombo=Combo;
    Score+=5-number;
    FSType=early;
    JudgeType=number;
    if(number!==0)
        if(early)FastCount++;else SlowCount++;
    Result[number]++;
    JudgeNew=time+JudgeTime;
}
function processKeydown(e) {
    let keys = e.keyCode,Key=0,Finded=false;
    if(null != audio1&&(!audio1.ended)&&time>0) {
        if(keys===27){
            audio1.paused?audio1.play():audio1.pause();
            if(!(audio1.ended||audio1.paused))startTime();
        }
    }
    for(let i=0;i<4;i++) {
        if (bindKey[i] === keys && !keyAsync[i]) {
            keyAsync[i] = true;
            keyLaserTime[i] = -1;
            Finded=true;
            Key=i;
            break;
        }
    }
    if(time<0)return;
    if(!Finded)return;
    if(null != audio1&&!audio1.ended&&!audio1.paused) {
        LineHold[Key]=-1;
        let i=LineQueueHead[Key];
        while(i<LineQueueTail[Key]&&!Objs[LineQueue[Key][i]]["Available"])i++;
        if (i >= LineQueueTail[Key]) return;
        let st = Objs[LineQueue[Key][i]]["StartTime"],
            et = Objs[LineQueue[Key][i]]["EndTime"];
        if (time + timing[5] < st) return;

        if (et === 0) {
            if (st < time - timing[5]) {
                MissEvent(time<st);
                LineQueueHead[Key]=i+1;
                return;
            }
            if (time - timing[0] <= st && st <= time + timing[0]) {
                HitEvent(Key, 0);
                LineQueueHead[Key]=i+1;
            } else if (time - timing[1] <= st && st <= time + timing[1]) {
                HitEvent(Key, 1, time<st);
                LineQueueHead[Key]=i+1;
            } else if (time - timing[2] <= st && st <= time + timing[2]) {
                HitEvent(Key, 2, time<st);
                LineQueueHead[Key]=i+1;
            } else if (time - timing[3] <= st && st <= time + timing[3]) {
                HitEvent(Key, 3, time<st);
                LineQueueHead[Key]=i+1;
            } else if (time - timing[4] <= st && st <= time + timing[4]) {
                HitEvent(Key, 4, time<st);
                LineQueueHead[Key]=i+1;
            } else {
                HitEvent(Key, 5, time<st);
                LineQueueHead[Key]=i+1;
            }
        } else if(Objs[LineQueue[Key][i]]["Available"]){
            if (st < time - timing[5]) {
                MissEvent(time<st);
                LineHold[Key]=-1;
                Objs[LineQueue[Key][i]]["Available"] = false;
                return;
            }
            LineHold[Key]=LineQueue[Key][i];
            if (time - timing[0] <= st && st <= time + timing[0]) {
                HitEvent(Key, 0, time<st);
            } else if (time - timing[1] <= st && st <= time + timing[1]) {
                HitEvent(Key, 1, time<st);
            } else if (time - timing[2] <= st && st <= time + timing[2]) {
                HitEvent(Key, 2, time<st);
            } else if (time - timing[3] <= st && st <= time + timing[3]) {
                HitEvent(Key, 3, time<st);
            } else if (time - timing[4] <= st && st <= time + timing[4]) {
                HitEvent(Key, 4, time<st);
            } else {
                HitEvent(Key, 5, time<st);
            }
        }
    }
}
function processKeyup(e){
    let keys = e.keyCode,Key=0,Finded=false;
    for(let i=0;i<4;i++) {
        if (bindKey[i] === keys && keyAsync[i]) {
            keyAsync[i] = false;
            keyLaserTime[i] = LaserTime+time;
            Finded=true;
            Key=i;
            break;
        }
    }
    if(time<0)return;
    if(!Finded)return;
    if(null != audio1&&!audio1.ended&&!audio1.paused) {
        let i=LineQueueHead[Key];
        while(i<LineQueueTail[Key]&&!Objs[LineQueue[Key][i]]["Available"])i++;
        if (i >= LineQueueTail[Key]) return;
        if (LineHold[Key] === -1) return;
        if (LineQueue[Key][i] !== LineHold[Key]) {
            LineHold[Key] = -1;
            return;
        }
        let et = Objs[LineQueue[Key][i]]["EndTime"];
        LineHold[Key] = -1;
        Objs[LineQueue[Key][i]]["Available"] = false;
        if (time + timing[5] < et) {
            MissEvent(time<et);

            return;
        }else if (time >= et) {
            HitEvent(Key, 0, time<et);
            return;
        }
        if (time - timing[0] <= et && et <= time + timing[0]) {
            HitEvent(Key, 0, time<et);
        } else if (time - timing[1] <= et && et <= time + timing[1]) {
            HitEvent(Key, 1, time<et);
        } else if (time - timing[2] <= et && et <= time + timing[2]) {
            HitEvent(Key, 2, time<et);
        } else if (time - timing[3] <= et && et <= time + timing[3]) {
            HitEvent(Key, 3, time<et);
        } else if (time - timing[4] <= et && et <= time + timing[4]) {
            HitEvent(Key, 4, time<et);
        } else {
            HitEvent(Key, 5, time<et);
        }

    }
}
function draw_Bar_Line() {
    ctx.save();
    for(let i=content["TimingPoints"][p][8];i<BPMnums;i++){
        BpB=BPMs[i][2];
        MpB=BPMs[i][1];
        measure=BpB*MpB;
        let a=false;
        for(let tt=BPMs[i][0]; i===BPMnums-1||(i<BPMnums-1&&tt<BPMs[i+1][0]); tt=tt+measure){
            a=true;
            if(tt<time)continue;
            let pos=calcPOS(tt);
            if(pos>800+noteThick)break;
            ctx.fillStyle="#FF0000";
            ctx.fillRect(0,800-pos+noteThick,600,2);
            a=false;
        }
        if(a)break;
    }
    ctx.restore();
}
function EndingScene() {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "start";
    ctx.textBaseline = "bottom";
    ctx.lineWidth=2;
    ctx.fillStyle = "#00FFFF";
    ctx.strokeStyle = "#007F7F";
    ctx.fillText("300 : "+String(Result[0]), 50, 150-50);
    ctx.strokeText("300 : "+String(Result[0]), 50, 150-50);
    ctx.fillStyle = "#FFFF00";
    ctx.strokeStyle = "#7F7F00";
    ctx.fillText("300 : "+String(Result[1]), 50, 215-50);
    ctx.strokeText("300 : "+String(Result[1]), 50, 215-50);
    ctx.fillStyle = "#00FF00";
    ctx.strokeStyle = "#007F00";
    ctx.fillText("200 : "+String(Result[2]), 50, 280-50);
    ctx.strokeText("200 : "+String(Result[2]), 50, 280-50);
    ctx.fillStyle = "#0000FF";
    ctx.strokeStyle = "#00007F";
    ctx.fillText("100 : "+String(Result[3]), 50, 345-50);
    ctx.strokeText("100 : "+String(Result[3]), 50, 345-50);
    ctx.fillStyle = "#7F7F7F";
    ctx.strokeStyle = "#3F3F3F";
    ctx.fillText("50 : "+String(Result[4]), 50, 410-50);
    ctx.strokeText("50 : "+String(Result[4]), 50, 410-50);
    ctx.fillStyle = "#FF0000";
    ctx.strokeStyle = "#7F0000";
    ctx.fillText("MISS : "+String(Result[5]+Result[6]), 50, 475-50);
    ctx.strokeText("MISS : "+String(Result[5]+Result[6]), 50, 475-50);
    ctx.fillStyle = "#0000FF";
    ctx.strokeStyle = "#00007F";
    ctx.fillText("FAST : "+String(FastCount), 50, 540-50);
    ctx.strokeText("FAST : "+String(FastCount), 50, 540-50);
    ctx.fillStyle = "#FF0000";
    ctx.strokeStyle = "#7F0000";
    ctx.fillText("SLOW : "+String(SlowCount), 50, 605-50);
    ctx.strokeText("SLOW : "+String(SlowCount), 50, 605-50);
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#7F7F7F";
    ctx.fillText("Score : "+String(Score)+"/"+String(EndScore), 50, 670-50);
    ctx.strokeText("Score : "+String(Score)+"/"+String(EndScore), 50, 670-50);
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#7F7F7F";
    ctx.fillText("Combo : "+String(MaxCombo)+"/"+String(HOnums+LN), 50, 735-50);
    ctx.strokeText("Combo : "+String(MaxCombo)+"/"+String(HOnums+LN), 50, 735-50);
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#7F7F7F";
    ctx.fillText("ACC : "+String(Math.round(Score/EndScore*10000)/100)+"%", 50, 800-50);
    ctx.strokeText("ACC : "+String(Math.round(Score/EndScore*10000)/100)+"%", 50, 800-50);
    ctx.restore();
}
function draw_Notes() {
    ctx.save();
    for(let Col=0;Col<4;Col++){
        for(let i=LineQueueHead[Col];i<LineQueueTail[Col];i++){

            if(Objs[LineQueue[Col][i]]["EndTime"]>0&&time-Objs[LineQueue[Col][i]]["EndTime"]>0){
                if(Objs[LineQueue[Col][i]]["Available"]&&LineHold[Col]===LineQueue[Col][i]){
                    HitEvent(Col, 0);
                    LineHold[Col]=-1;
                    LineQueueHead[Col]=i+1;
                    continue;
                }
            }
            if(LineHold[Col]!==LineQueue[Col][i]) {
                if(Objs[LineQueue[Col][i]]["Available"])
                    if (time - Objs[LineQueue[Col][i]]["StartTime"] > timing[5]) {
                        MissEvent(time<Objs[LineQueue[Col][i]]["StartTime"]);
                        if (Objs[LineQueue[Col][i]]["EndTime"] === 0) {
                            LineQueueHead[Col] = i + 1;
                            continue;
                        } else {
                            Objs[LineQueue[Col][i]]["Available"] = false;
                        }

                    }
            }
            let L=0;
            let color="#FFFFFF";
            ctx.strokeStyle="#FF0000";
            switch(Col){
                case 1:
                    L=150;
                    color="#0BFFFF";
                    break;
                case 2:
                    L=300;
                    color="#0BFFFF";
                    break;
                case 3:
                    L=450;
                    break;
            }
            if(!Objs[LineQueue[Col][i]]["Available"]){
                color="#7F7F7F";
                ctx.strokeStyle="#7F0000";
                switch(Col){
                    case 1:
                        color="#0b7f7f";
                        break;
                    case 2:
                        color="#0B7F7F";
                        break;
                    case 3:
                        break;
                }
            }
            ctx.fillStyle=color;

            ctx.lineWidth=4;
            let pos=calcPOS(Objs[LineQueue[Col][i]]["StartTime"]);
            if(pos>800+noteThick)break;
            if(Objs[LineQueue[Col][i]]["EndTime"]!==0){
                let pos2=calcPOS(Objs[LineQueue[Col][i]]["EndTime"]);
                if(pos2<0){
                    continue;
                }
                ctx.fillRect(L,800-pos2,150,pos2-pos+noteThick);
                ctx.strokeRect(L+2,800-pos2+2,150-4,pos2-pos+noteThick-4);

            }else{
                if(pos<0){
                    continue;
                }
                ctx.fillRect(L,800-pos,150,noteThick);
            }
        }
    }
    ctx.restore();
}
function draw_Lasers() {
    ctx.save();
    for(let Col=0;Col<4;Col++){
        if(keyLaserTime[Col]===0)continue;
        let Width=0;
        if(keyLaserTime[Col]===-1)Width=150;else
            Width=(keyLaserTime[Col]-time)*150/LaserTime;
        if(Width<0){
            keyLaserTime[Col]=0;
            continue;
        }
        let L=Col*150;
        ctx.fillStyle=linear;
        ctx.globalAlpha=Width/150;
        ctx.fillRect(L+(150-Width)/2,500,Width,300);
        //ctx.globalAlpha=1;
    }
    ctx.restore();
}
function draw_Combo() {
    if(Combo===0)return;
    ctx.save();
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#7F7F7F";
    ctx.lineWidth=4;
    ctx.strokeText(Combo, 300, 180);
    ctx.fillText(Combo, 300, 180);
    ctx.restore();
}
function draw_Score() {
    ctx.save();
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "end";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#7F7F7F";
    ctx.lineWidth=4;
    ctx.strokeText(Score, 580, 50);
    ctx.fillText(Score, 580, 50);
    ctx.restore();
}
function draw_ACC() {
    ctx.save();
    ctx.font = "bold 25px Arial";
    ctx.textAlign = "end";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#7F7F7F";
    ctx.lineWidth=4;
    let Accuracy=Math.round(Score/EndScore*10000)/100;
    ctx.strokeText(Accuracy+"%", 580, 80);
    ctx.fillText(Accuracy+"%", 580, 80);
    ctx.restore();
}
function draw_Judge() {
    if(JudgeNew==0)return;
    if(JudgeNew-time<0){
        JudgeNew=0;
        return;
    }
    ctx.save();
    ctx.font = "bold 90px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.lineWidth=4;
    switch(JudgeType){
        case 0:
            ctx.fillStyle = "#00FFFF";
            ctx.strokeStyle = "#007F7F";
            ctx.fillText("PERFECT", 300, 280);
            ctx.strokeText("PERFECT", 300, 280);
            break;
        case 1:
            ctx.fillStyle = "#FFFF00";
            ctx.strokeStyle = "#7F7F00";
            ctx.fillText("PERFECT", 300, 280);
            ctx.strokeText("PERFECT", 300, 280);
            break;
        case 2:
            ctx.fillStyle = "#00FF00";
            ctx.strokeStyle = "#007F00";
            ctx.fillText("GREAT", 300, 280);
            ctx.strokeText("GREAT", 300, 280);
            break;
        case 3:
            ctx.fillStyle = "#0000FF";
            ctx.strokeStyle = "#00007F";
            ctx.fillText("GOOD", 300, 280);
            ctx.strokeText("GOOD", 300, 280);
            break;
        case 4:
            ctx.fillStyle = "#FF0000";
            ctx.strokeStyle = "#7F0000";
            ctx.fillText("BAD", 300, 280);
            ctx.strokeText("BAD", 300, 280);
            break;
        case 5:
            ctx.fillStyle = "#FF0000";
            ctx.strokeStyle = "#7F0000";
            ctx.fillText("MISS", 300, 280);
            ctx.strokeText("MISS", 300, 280);
            break;
        case 6:
            ctx.fillStyle = "#FF0000";
            ctx.strokeStyle = "#7F0000";
            ctx.fillText("MISS", 300, 280);
            ctx.strokeText("MISS", 300, 280);
            break;
        default:
    }
    ctx.restore();
}
function draw_FS() {
    if(JudgeNew==0)return;
    if(JudgeNew-time<0){
        JudgeNew=0;
        return;
    }
    if(JudgeType==0)return;
    ctx.save();
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.lineWidth=2;
    if(FSType) {
        ctx.fillStyle = "#0000FF";
        ctx.strokeStyle = "#00007F";
        ctx.strokeText("FAST", 300, 192);
        ctx.fillText("FAST", 300, 192);
    }else{
        ctx.fillStyle = "#FF0000";
        ctx.strokeStyle = "#7F0000";
        ctx.strokeText("LATE", 300, 192);
        ctx.fillText("LATE", 300, 192);
    }

    ctx.restore();
}
function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    draw_Bar_Line();
    draw_Notes();
    draw_Lasers();
    draw_Combo();
    draw_Score();
    draw_ACC();
    draw_Judge();
    draw_FS();
}