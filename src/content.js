(() => {
    'use strict';
    const timer = (delay) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(delay);
            }, delay);
        });
    };

    const debounce = (callback, wait) => {
        let timeout;
        return (...args) => {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => callback.apply(context, args), wait);
        };
    };

    const throttle = (callback, interval) => {
        var lastTime = Date.now() - interval;
        return (...args) => {
            const context = this;
            if ((lastTime + interval) < Date.now()) {
                lastTime = Date.now();
                callback.apply(context, args);
                return;
            }
        };
    };

    const storageKeys = {
        thredListWidth: "thredListWidth",
        twopane: "twopane"
    };

    class ThredListAndBody {
        constructor() {
            this.changeWidtdhEventListners = [];
            this.getElements();
            if (this.contentLeft !== null && this.contentBody !== null) {
                this.ready = true;
                this.addEventListener();
                this.windowScrollEvent = throttle(() => {
                    (async () => {
                        await timer(50);
                        this.clickReadMoreIfDisplayed();
                    })();
                }, 50);
                window.addEventListener('scroll', this.windowScrollEvent);
                let that = this;
                chrome.storage.local.get([storageKeys.thredListWidth], (result) => {
                    if (result.thredListWidth !== undefined) {
                        that.changeWidth(result.thredListWidth);
                    }
                });
                return;
            }
            this.ready = false;
        }
        clickReadMoreIfDisplayed() {
            let isDisplayReadMore = (this.readMore.getBoundingClientRect().top - window.innerHeight) < 0;
            if (isDisplayReadMore && this.readMore.style.display !== "none" && this.readMoreLoading !== true) {
                this.readMore.click();
            }

        }
        getElements() {
            this.contentLeft = document.querySelector(".gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-left");
            this.threadListItemLink = document.querySelectorAll(".gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-threadlist-item-link");
            this.threadList = [];
            this.threadListItemLink.forEach(element => {
                this.threadList.push({
                    title: element.title,
                    item: element.parentElement,
                    link: element
                });
            });
            this.contentBody = document.querySelector(".gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-body");
            var readMores = document.querySelectorAll(".gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-threadlist-readmore");
            this.readMore = readMores[readMores.length - 1];
        }
        addEventListener() {
            this.readMore.addEventListener('click', () => {
                if (this.readMoreLoading) {
                    return;
                }
                this.readMoreLoading = true;
                (async () => {
                    await timer(250);
                    this.getElements();
                    this.addEventListener();
                    this.changeWidth(this.contentBody.offsetLeft);
                    this.readMoreLoading = false;
                    this.filter(this.filterdKeyword);
                })();
            });
        }
        changeWidth(width) {
            // super heavy
            if (this.ready === false) {
                return;
            }
            var widthWithPx = null;
            if (width !== null) {
                widthWithPx = width + "px";
            }
            this.contentLeft.style.width = widthWithPx;
            this.threadListItemLink.forEach(element => {
                element.style.width = widthWithPx;
            });
            this.contentBody.style.marginLeft = widthWithPx;
            chrome.storage.local.set({ thredListWidth: width });
            this.changeWidtdhEventListners.forEach(listener => {
                listener(width);
            });
        }
        filter(keyword) {
            if (typeof keyword !== "string") {
                keyword = "";
            }
            this.filterdKeyword = keyword;
            this.threadList.forEach(thread => {
                var item = thread.item;
                var link = thread.link;
                if (thread.title.includes(keyword)) {
                    item.style.display = null;
                    link.innerHTML = thread.title.replace(keyword, `<mark>${keyword}</mark>`);
                } else {
                    item.style.display = "none";
                    link.innerHTML = thread.title;
                }
            });
            this.clickReadMoreIfDisplayed();
        }
        addChangeWidthEventListener(listner) {
            this.changeWidtdhEventListners.push(listner);
        }
    }

    class DraggableBar {
        constructor(threadListAndBody) {
            this.setup(threadListAndBody);
        }
        setup(threadListAndBody) {
            this.draggableBar = document.querySelector("#kinspax-draggable-bar");
            if (this.draggableBar === null) {
                this.threadListAndBody = threadListAndBody;
                this.setupThreadlist();
                this.threadListAndBody.addChangeWidthEventListener(() => {
                    this.layout();
                });
                this.draggableBar = document.createElement("div");
                this.draggableBar.id = "kinspax-draggable-bar";
                this.layout();
                this.setupMouseEvent();
                this.insertBar();
            } else {
                this.layout();
                this.setupMouseEvent();
            }
        }
        setupThreadlist() {
            this.threadListAndBody.contentLeft.ondragstart = () => {
                return false;
            };
            this.threadListAndBody.contentBody.ondragstart = () => {
                return false;
            };
        }
        setupMouseEvent() {
            let that = this;
            let onMouseMove = (event) => {
                if (event.pageX > 0) {
                    that.draggableBar.style.left = event.pageX + "px";
                }
            };
            let onMouseUp = (event) => {
                if (event.pageX > 0) {
                    that.threadListAndBody.changeWidth(event.pageX);
                    that.draggableBar.style.left = event.pageX + "px";
                }
            };
            that.draggableBar.ondragstart = () => {
                return false;
            };

            that.draggableBar.onmousedown = () => {
                document.addEventListener('mousemove', onMouseMove);
                that.draggableBar.onmouseup = (event) => {
                    onMouseUp(event);
                    document.removeEventListener('mousemove', onMouseMove);
                    that.draggableBar.onmouseup = null;
                };
            };

            this.draggableBar.addEventListener('dblclick', () => {
                that.threadListAndBody.changeWidth(null);
            });
        }
        layout() {
            this.syncHeight();
            this.syncXPosition();
        }
        syncHeight() {
            const intervalId = setInterval(() => {
                let spacebody = document.querySelector(".gaia-argoui-space-spacelayout-body");
                let computedStyleHeight = parseInt(window.getComputedStyle(spacebody).getPropertyValue("height"), 10);
                if (computedStyleHeight > 0) {
                    this.draggableBar.style.height = computedStyleHeight + "px";
                    clearInterval(intervalId);
                }
            }, 600);
        }
        syncXPosition() {
            this.draggableBar.style.left = this.threadListAndBody.contentBody.offsetLeft + "px";
        }
        insertBar() {
            this.threadListAndBody.contentLeft.insertAdjacentElement('afterend', this.draggableBar);
        }
    }

    class ContentRight {
        constructor() {
            this.setup();
        }
        setup() {
            this.twopaneButton = document.querySelector("#kinspax-twopane-button");
            if (this.twopaneButton === null) {
                this.getElements();
                this.twopaneButton = document.createElement("a");
                this.twopaneButton.id = "kinspax-twopane-button";
                this.collapseButton.insertAdjacentElement('beforebegin', this.twopaneButton);
                this.addButtonEventListener();
                chrome.storage.local.get([storageKeys.twopane], (result) => {
                    if (result.twopane === true) {
                        this.toggleTwopane(true);
                    }
                });

            }
        }
        getElements() {
            this.collapseButton = document.querySelector(".gaia-argoui-space-toolbar-collapse");
            this.expandButton = document.querySelector(".gaia-argoui-space-toolbar-expand");
            this.contentBody = document.querySelector(".gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-body");
            this.contentRight = document.querySelector(".gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-right ");
        }
        addButtonEventListener() {
            this.twopaneButton.addEventListener('click', () => {
                this.toggleTwopane(true);
            });
            this.collapseButton.addEventListener('click', () => {
                this.toggleTwopane(false);
            });
            this.expandButton.addEventListener('click', () => {
                this.toggleTwopane(false);
            });
        }
        toggleTwopane(toCollapsed) {
            if (toCollapsed === true) {
                this.expandButton.click();
                this.expandButton.classList.remove("is-active");
                this.twopaneButton.classList.add("is-active");
                this.contentBody.style.marginRight = "0px";
                this.contentBody.style.borderRight = "0px";
                this.contentRight.style.display = "none";
                chrome.storage.local.set({ twopane: true });
            } else {
                this.twopaneButton.classList.remove("is-active");
                this.contentBody.style.marginRight = null;
                this.contentBody.style.borderRight = null;
                this.contentRight.style.display = null;
                chrome.storage.local.set({ twopane: false });
            }
        }
    }

    class FilterThread {
        constructor(threadListAndBody) {
            this.setup(threadListAndBody);
        }
        setup(threadListAndBody) {
            this.searchBox = document.querySelector("#kinspax-serchbox");
            if (this.searchBox === null) {
                this.threadListAndBody = threadListAndBody;
                this.threadListAndBody.addChangeWidthEventListener((width) => {
                    this.layout(width);
                });
                this.createSearchBox();
                this.addEventListener();
                this.insertSearchInput();
            }
        }
        createSearchBox() {
            this.searchBox = document.createElement("div");
            this.searchBox.id = "kinspax-serchbox";
            this.serachInput = document.createElement("input");
            this.serachInput.id = "kinspax-searchbox-input";
            this.serachInput.type = "text";
            this.serachInput.placeholder = "Filter Thread";
            this.serachInput.autocomplete = "off";
            this.searchBox.insertAdjacentElement('afterbegin', this.serachInput);
        }
        addEventListener() {
            this.serachInput.addEventListener('input', debounce((event) => {
                let keyword = event.srcElement.value;
                this.threadListAndBody.filter(keyword);
            }, 200));

            this.serachInput.addEventListener('keydown', throttle((event) => {
                if (event.isComposing) {
                    return;
                }
                let keyword = event.srcElement.value;
                if (keyword.length === 0) {
                    return;
                }
                var keyName = event.key;
                if (keyName === "ArrowDown") {
                    event.preventDefault();
                    this.selectNext();
                } else if (keyName === "ArrowUp") {
                    event.preventDefault();
                    this.selectPrev();
                }
            }, 100));
        }
        selectNext() {
            var selectedIndex = -1;
            var firstDisplayedLink = null;
            let nextThread = this.threadListAndBody.threadList.filter((thread) => {
                return thread.item.style.display !== "none";
            }).find((thread, index) => {
                if (firstDisplayedLink === null) {
                    firstDisplayedLink = thread.link;
                }
                if (thread.link.classList.contains("selected")) {
                    selectedIndex = index;
                } else if (selectedIndex >= 0) {
                    return true;
                }
                return false;
            });
            if (nextThread !== undefined) {
                nextThread.link.click();
            } else if (selectedIndex === -1 && firstDisplayedLink != null) {
                firstDisplayedLink.click();
            }
        }
        selectPrev() {
            var selectedIndex = -1;
            let prevThread = this.threadListAndBody.threadList.slice().reverse().filter((thread) => {
                return thread.item.style.display !== "none";
            }).find((thread, index) => {
                if (thread.link.classList.contains("selected")) {
                    selectedIndex = index;
                } else if (selectedIndex >= 0) {
                    return true;
                }
                return false;
            });
            if (prevThread !== undefined) {
                prevThread.link.click();
            }
        }
        insertSearchInput() {
            this.threadListAndBody.contentLeft.insertAdjacentElement('afterbegin', this.searchBox);
        }
        layout(width) {
            let paddingLeft = parseInt(window.getComputedStyle(this.serachInput).getPropertyValue("padding-left"), 10);
            let paddingRight = parseInt(window.getComputedStyle(this.serachInput).getPropertyValue("padding-right"), 10);
            if (width !== null) {
                var newWidth = width - paddingLeft - paddingRight;
                newWidth = newWidth > 0 ? newWidth : 0;
                this.serachInput.style.width = newWidth + "px";
            } else {
                this.serachInput.style.width = null;
            }
        }
    }

    var draggable;
    var contentRight;
    var filterThread;
    var setup = () => {
        const intervalId = setInterval(() => {
            if (chrome.storage === undefined) {
                console.log("chrome.storage is undefined");
                return;
            }
            let threadListAndBody = new ThredListAndBody();
            if (threadListAndBody.ready === true) {
                if (draggable !== undefined) {
                    draggable.setup(threadListAndBody);
                } else {
                    draggable = new DraggableBar(threadListAndBody);
                }
                if (contentRight !== undefined) {
                    contentRight.setup();
                } else {
                    contentRight = new ContentRight(threadListAndBody);
                }
                if (filterThread !== undefined) {
                    filterThread.setup(threadListAndBody);
                } else {
                    filterThread = new FilterThread(threadListAndBody);
                }
                clearInterval(intervalId);
            }
        }, 1000);
    };
    setup();
    window.onhashchange = () => {
        setup();
    };

})();