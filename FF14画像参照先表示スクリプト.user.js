// ==UserScript==
// @name        FF14画像参照先表示スクリプト
// @namespace   nohohon
// @author      nohohon
// @description 画像管理ページで画像の参照先を表示する
// @include     http://jp.finalfantasyxiv.com/lodestone/my/image/*
// @version     1.0.2
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @grant       GM_log
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
// @grant       GM_getResourceText
// @resource    usconfigcss https://raw.github.com/NohohonNohon/ff14ExternalScript/master/usconfig.css.template
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require     https://raw.github.com/NohohonNohon/ff14ExternalScript/master/usconfig.js
// ==/UserScript==
(function($) {
    //共通定数
        /** 画像の参照先データを格納する時に先頭に付与するGM_Value名称 */
        var IMAGE_REFERER = 'img_referer_';
        /** 取得日付を格納するGM_Value名称 */
        var LOAD_DATE = 'load_date';
    
    /** 
    * GM_xmlhttpRequestのエラー時のconsole出力処理
    * @param {ResponseObject} レスポンスオブジェクト
    */
    function outputXmlhttpRequestErrorLog(res) {
        var msg = "An error occurred."
            + "\nresponseText: " + res.responseText
            + "\nreadyState: " + res.readyState
            + "\nresponseHeaders: " + res.responseHeaders
            + "\nstatus: " + res.status
            + "\nstatusText: " + res.statusText
            + "\nfinalUrl: " + res.finalUrl;
        console.log(msg);
    }
    
    //==================================================
    /** 各タスクの開始をコントロールする */
    //==================================================
    var TaskControl = (function() {
        
        /** 
        * 全てのタスクを順番に実行
        */
        function* executeAllTask() {
            try {
                Task1.startTask();
                yield;
                Task1.endTask();
                Task2.startTask();
                yield;
                Task2.endTask();
                Task3.startTask();
                yield;
                Task3.endTask();
                Task4.startTask();
                yield;
                Task4.endTask();
            } catch (e) {
                alert("エラーが発生しました。");
                console.log("エラー：" + e);
                CustomConfig.initProgressBar(0,"");
                CustomConfig.updateProgressBar(0);
            }
            execute_flag = false;
        }
        
        var global = {
            /** ジェネレータオブジェクト */
            generator_obj: null,
            /** 処理実行中フラグ */
            execute_flag: false,
            
            /** 
            * 各タスクのグローバル変数を初期化する
            */
            init: function() {
                Task1.blog_count = 0;
                Task2.blog_url_Array = [];
                Task3.image_referer_Array = [];
            },
            
            /**
             * タスクの変数を初期化し、全てのタスクを順番に実行
             */
            execute: function() {
                execute_flag = true;
                this.init();
                this.generator_obj = executeAllTask();
                this.generator_obj.next();
            }
            
        };
        return global;
    })();
    
    //==================================================
    /** タスク１：日記の件数を取得する */
    //==================================================
    var Task1 = (function() {
        /** 処理説明 */
        var TASK_BLOG_COUNT = '日記の件数を取得しています...';
        
        /** 
        * 日記の件数を取得する
        * @param {func} コールバック関数
        */
        function getBlogCount(call_back_func) {
            var blog_list_url = $("a[onclick *= 'myblog']").attr('href');
            GM_xmlhttpRequest({
            method: 'get',
            url: blog_list_url,
            onload: function(res) {
                    var xml = $.parseHTML(res.responseText);
                    Task1.blog_count = $($('.total',xml)[0]).text();
                    call_back_func();
            }, onerror: function(res) {
                outputXmlhttpRequestErrorLog(res);
                call_back_func();
            }, ontimeout: function() {
                console.log('getBlogMaxCount() is Timout' + blog_list_url);
                call_back_func();
            }
            });
        }
        
        var global = {
            /** 日記件数 */
            blog_count : 0,

            /**
             * 処理開始
             */
            startTask: function() {
                CustomConfig.initProgressBar(1,TASK_BLOG_COUNT);
                getBlogCount(function() {
                    CustomConfig.updateProgressBar(1);
                    TaskControl.generator_obj.next();
                });
            },
            
            /** 
            * 処理終了
            */
            endTask: function() {
                if (Task1.blog_count == 0) {
                    alert('日記の件数を取得できませんでした。');
                    TaskControl.execute_flag = false;
                    return;
                }
            }
        };
        return global;
    })();
    
    
    //==================================================
    /** タスク２：日記の一覧を取得する */
    //==================================================
    var Task2 = (function() {
        /** 処理説明 */
        var TASK_BLOG_LIST_LOAD = '日記の一覧を取得しています...';
        
        /** 日記URL取得成功 */
        var success_Array = ['URL'];
        /** 日記URL取得エラー */
        var error_Array = ['URL'];
        
       /** 
        * 日記一覧から日記のURLとタイトルを取得する
        * @param {String} 日記一覧のURL 
        */
        function getBlogURL(url) {
            GM_xmlhttpRequest({
            method: 'get',
            url: url,
            onload: function(res) {
                var xml = $.parseHTML(res.responseText);
                $('.blog_title',xml).each(function() {
                    var url = $(this).attr('href');
                    var title = $(this).text();
                    Task2.blog_url_Array.push([url,title]);
                });
                success_Array.push(url);
            }, onerror: function(res) {
                outputXmlhttpRequestErrorLog(res);
                error_Array.push(url);
            }, ontimeout: function() {
                console.log('getBlogURL() is Timout:' + url);
                error_Array.push(url);
            }
            });
        }
        
        /** 
        *  プログレスバーの表示更新
        */
        function updateProgress() {
            var value = success_Array.length + error_Array.length;
            CustomConfig.updateProgressBar(value);
        }
        
        var global = {
            /** 日記URLデータ */
            blog_url_Array : [['URL','タイトル']],
        
            /**
             * 処理開始
             */
            startTask: function() {
                success_Array = [];
                error_Array = [];
                this.blog_url_Array = [];
                var blog_list_count = Math.ceil(Task1.blog_count / 10);
                CustomConfig.initProgressBar(blog_list_count,TASK_BLOG_LIST_LOAD);
                for (var n = 0; n < blog_list_count; n++) {
                    var blog_list_url = 'http://jp.finalfantasyxiv.com/lodestone/character/8564933/blog/?page=' + (n+1);
                    getBlogURL(blog_list_url);
                }
                //記事一覧取得待機
                setTimeout(function loop(){
                    updateProgress();
                    if(CustomConfig.progressViewFlag == true) {
                        setTimeout(loop,100);
                        return;
                    } else {
                        TaskControl.generator_obj.next();
                    }
                },100);
            },
            
            /** 
            * 処理終了
            */
            endTask: function() {
                if (error_Array.length != 0) {
                    alert('日記の一覧取得でエラーが発生しました。');
                    TaskControl.execute_flag = false;
                    return;
                }
            }
        };
        return global;
    })();
    
    //==================================================
    /** タスク３：画像の一覧を取得する */
    //==================================================
    var Task3 = (function() {
        /** 処理説明 */
        var TASK_BLOG_IMAGE_LOAD = '画像の一覧を取得しています...';
        
        /** 画像取得成功 */
        var success_Array = ['URL'];
        /** 画像取得エラー */
        var error_Array = ['URL'];
        
        /** 
        * 日記で使われている画像を取得する
        * @param {String} 日記のURL
        * @param {String} 日記のタイトル
        */
        function getBlogImage(url,title) {
            GM_xmlhttpRequest({
            method: 'get',
            url: url,
            onload: function(res) {
                    try {
                        //ページのソースから画像データ部分を抜き出す
                        var url_pattern = /http\:\/\/img2.finalfantasyxiv.com\/accimg2\/.*_110\.jpg/ig;
                        var img_url_list = res.responseText.match(url_pattern);
                        Task3.image_referer_Array.push([url,title,img_url_list]);
                        success_Array.push(url);
                    } catch(err) {
                        console.log(err);
                        error_Array.push(url);
                    }
            }, onerror: function(res) {
                outputXmlhttpRequestErrorLog(res);
                error_Array.push(url);
            }, ontimeout: function() {
                console.log('getBlogImage() is Timout' + url);
                error_Array.push(url);
            }
            });
        }
        
        /** 
        *  プログレスバーの表示更新
        */
        function updateProgress() {
            var value = success_Array.length + error_Array.length;
            CustomConfig.updateProgressBar(value);
        }
        
        var global = {
            /** 画像参照データ */
            image_referer_Array: [['URL','タイトル',['画像URL']]],
        
            /**
             * 処理開始
             */
            startTask: function() {
                success_Array = [];
                error_Array = [];
                this.image_referer_Array = [];
                CustomConfig.initProgressBar(Task1.blog_count,TASK_BLOG_IMAGE_LOAD);
                for (var n = 0; n < Task1.blog_count; n++) {
                    getBlogImage(Task2.blog_url_Array[n][0],Task2.blog_url_Array[n][1]);
                }
                //記事一覧取得待機
                setTimeout(function loop(){
                    updateProgress();
                    if(CustomConfig.progressViewFlag == true) {
                        setTimeout(loop,100);
                        return;
                    } else {
                        TaskControl.generator_obj.next();
                    }
                },100);
            },
            
            /** 
            * 処理終了
            */
            endTask: function() {
                if (error_Array.length != 0) {
                    alert('画像の一覧取得でエラーが発生しました。');
                    TaskControl.execute_flag = false;
                    return;
                }
            }
        };
        return global;
    })();
    
    
    //==================================================
    /** タスク４：画像の一覧を保存する */
    //==================================================
    var Task4 = (function() {
        /** 処理説明 */
        var TASK_BLOG_IMAGE_SAVE = '取得した画像の一覧を保存しています...';
        
        /** 
        * GM_Valueを全てクリアする
        */
        function clearGMValue() {
            var vals = GM_listValues();
            for (var n = 0; n < vals.length; n++) {
                GM_deleteValue(vals[n]);
            }
        }
        
        /** 
        * 現在の日時を文字列として取得する
        * @returns {String} 現在の日時
        */
        function getCurrentDate() {
            var date = new Date();
            return [
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate()
                ].join( '/' ) + ' '
                + date.toLocaleTimeString();
        }
        
        /** 
        * 非同期ループ
        * @param {Array} 処理対象の配列
        * @param {func} 配列１要素の処理を行う関数
        * @param {func} 処理完了時に呼び出す関数
        *  http://nanoappli.com/blog/archives/768
        */
        function runAcyncArray( params, onProcess, onFinish ) {
            var paramList = params.concat();    // 配列のコピーを作る
            var loop_count = 0;
            
            function loop() {
                var startTime = new Date(); // 開始時刻を覚える
                // タイムアウトになるまで処理を行う
                while ( 1 ) {
                    var curParam = paramList.shift();
                    // 配列を1要素処理する
                    onProcess(curParam,loop_count);
                    loop_count++;
                    if ( paramList.length <= 0 ) {
                        // 全要素処理を行った -> 終了処理
                        onFinish( params );
                        return;
                    }
                    if ( (new Date()) - startTime > 100 ) {
                        // タイムアウト発生 -> 一旦処理を終わる
                        break;
                    }
                }
                // 40ms待機後、続きの処理を行う
                setTimeout( loop, 40 );
            };
            setTimeout( loop, 10 );
        }
        
        /** 
        * 画像参照データをGM_Valueに格納する
        * @param {Array} 処理対象の配列
        * @param {Number} ループ回数
        */
        function setImageReferer(curParam,loop_count) {
            var blog_url = curParam[0];
            var blog_title = curParam[1];
            var img_list = curParam[2];
            if(img_list == null) {
                return;
            }
            var image_count = img_list.length;
            for (var i = 0; i < image_count; i++) {
                var image_id = Task4.getImageId(img_list[i]);
                var image_referer_data = []; 
                image_referer_data = GM_getValue(IMAGE_REFERER + image_id,[]);
                image_referer_data.push([blog_url,blog_title]);
                GM_setValue(IMAGE_REFERER + image_id,image_referer_data);
            }
            CustomConfig.updateProgressBar(loop_count+1);
        }
        
        var global = {
            
            /** 
            * 画像URLから画像IDを取得する
            * @param {String} 画像URL
            * @returns {String} 画像ID
            */
            getImageId: function(img_url) {
                var pattern = /.*\/([a-zA-Z0-9]*)_/;
                return img_url.match(pattern)[1];
            },
        
            /**
             * 処理開始
             */
            startTask: function() {
                clearGMValue();
                CustomConfig.initProgressBar(Task1.blog_count,TASK_BLOG_IMAGE_SAVE);
                //画像の参照先データをGM_Valueに格納する
                runAcyncArray(Task3.image_referer_Array,setImageReferer,function() {
                    GM_setValue(LOAD_DATE,getCurrentDate());
                    TaskControl.generator_obj.next();
                });
            },
            
            /** 
            * 処理終了
            */
            endTask: function() {
                CustomConfig.setLoadDate();
                TaskControl.init();
                alert('日記データの読み込みが完了しました。');
                window.location.reload();
            }
        };
        return global;
    })();
	
    
    //==================================================
    /** 設定関連処理 */
    //==================================================
    //http://d.hatena.ne.jp/h1mesuke/20100713/p1
    var CustomConfig = (function() {
        
        Config.define('setting', function() {
            with (this.builder) {
            dialog(
                    'FF14画像参照スクリプト',
                    { width: 400, height: 300 },
                    section(
                            '日記データ読み込み',
                            '画像の参照先を検索するために日記データを読み込みます。',
                            grid(
                                {layout: 'manual'},
                                button('日記データ読み込み', 'load_blog',clickLoadBtn)
                            )
                    )
            );
            }
        }, {
            saveKey: 'GM_config',
            aftersave: function() {},
            afteropen : function() {
                var iframe_doc = this.frame.contentDocument;
                setCustomConfig(iframe_doc);
                //取得日付を設定する
                $('#load_date', iframe_doc).text(GM_getValue(LOAD_DATE,'なし'));
                CustomConfig.setLoadDate();
            }
        });
        settings = Config.load();
        
        /** 
        * コンフィグ画面をカスタマイズする
        * @param {HtmlDocument} コンフィグ画面のドキュメントオブジェクト
        */
        function setCustomConfig(iframe_doc) {
            $('#reset_button', iframe_doc).css('display', 'none');
            $('#save_button', iframe_doc).css('display', 'none');
            $('#cancel_button', iframe_doc).text('閉じる');
            $('#button_reload_blog', iframe_doc).prop("disabled", true);
            $('.manual', iframe_doc).css('text-align','center');
            $('.manual', iframe_doc).append([
                '<tr>',
                '	<td>取得日付：',
                '		<span id="load_date" style="margin-left:5px">なし</span>',
                '	</td>',
                '</tr>',
                '<tr id="progress_tr" style="display:none">',
                '	<td>',
                '		<div>',
                '			<progress id="progress_bar" value="0" max="100"></progress>',
                '		</div>',
                '		<div id="progress_task"></div>',
                '	</td>',
                '</tr>'
            ].join(''));
        }
        
        /** 
        * 日記データ読み込みボタンクリック時の処理
        */
        function clickLoadBtn() {
            if (TaskControl.execute_flag == true) {
                return;
            }
            TaskControl.execute();
        }
        
        var gloabl = {
            /** プログレスバーの表示フラグ */
            progressViewFlag: false,
            
            /** 
            * プログレスバーの初期設定
            * @param {Number} 総作業量
            * @param {String} 処理の説明
            */
            initProgressBar: function(max,task) {
                var iframe = document.getElementById("usconfig_frame");
                var iframe_doc = iframe.contentDocument;
                var progress_bar_obj = $('#progress_bar', iframe_doc);
                progress_bar_obj.attr('value',0);
                progress_bar_obj.attr('max',max);
                $('#progress_task', iframe_doc).text(task);
                $('#progress_tr', iframe_doc).css('display', 'table-row');
                this.progressViewFlag = true;
            },
            
            /** 
            * プログレスバーの進捗状況を更新する
            * @param {Number} 進捗状況
            */
            updateProgressBar: function(value) {
                var iframe = document.getElementById("usconfig_frame");
                var iframe_doc = iframe.contentDocument;
                var progress_bar_obj = $('#progress_bar', iframe_doc);
                var max = progress_bar_obj.attr('max');
                progress_bar_obj.attr('value',value);
                if(value == max) {
                    $('#progress_tr', iframe_doc).css('display', 'none');
                    this.progressViewFlag = false;
                } else {
                    $('#progress_tr', iframe_doc).css('display', 'table-row');
                    this.progressViewFlag = true;
                }
            },
            
            /** 
            * 取得日付を設定する
            */
            setLoadDate: function() {
                var iframe = document.getElementById("usconfig_frame");
                var iframe_doc = iframe.contentDocument;
                $('#load_date', iframe_doc).text(GM_getValue(LOAD_DATE,'なし'));
            }
        };
        return gloabl;
    })();
    
    
    //==================================================
    /** 画像の参照先を表示する */
    //==================================================
    var ImageReferer = (function() {
        
        /** 
        * 画像IDから参照先を取得し、指定した要素に追加する
        * @param {String} 画像ID
        * @param {Element} 参照先を追加する要素
        */
        function addImageReferer(image_id,elem) {
            var image_referer_data = []; 
            image_referer_data = GM_getValue(IMAGE_REFERER + image_id,[]);
            for (var n = 0; n < image_referer_data.length; n++) {
                var url = image_referer_data[n][0];
                var title = image_referer_data[n][1];
                $(elem).append([
                    '<div class="busyTxt" style="width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
                    'float:right;text-align:left;color:#73bfe6;">',
                    '	<img src="http://img.finalfantasyxiv.com/lds/pc/global/images/common/ic/busy.png?1370575015">',
                    '	<a href="',url,'" title="',title,'" >',title,'</a>',
                    '</div>'
                ].join(''));
            }
        }
        
        var gloabl = {
            
            /** 
            * 参照先を表示する
            */
            viewReferer: function() {
                var thumbnail_html = $('.img_box_list').html();
                        //ページのソースから画像データ部分を抜き出す
                var url_pattern = /http\:\/\/img2.finalfantasyxiv.com\/accimg2\/.*_54\.jpg/ig;
                var imaeg_url_list = thumbnail_html.match(url_pattern);
                    if(imaeg_url_list == null) {
                    return;
                }
                var status_elem = $('div.status_view div.status');
                for (var n = 0; n < imaeg_url_list.length; n++) {
                    var image_url = imaeg_url_list[n];
                    var image_id = Task4.getImageId(image_url);
                    addImageReferer(image_id,status_elem.eq(n));
                }
            }
        };
        return gloabl;
    })();
    
	
    //==================================================
    /** メイン関数 */
    //==================================================
    function main() {
		GM_registerMenuCommand('FF14画像参照先表示(設定)', Config.open);
        ImageReferer.viewReferer();
    }
    //メイン関数の呼び出し
    main();
})(jQuery);