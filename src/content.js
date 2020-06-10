(() => {
    'use strict';
    const timer = (delay) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(delay);
            }, delay);
        });
    };

    const storageKeys = {
        thredListWidth: "thredListWidth",
        twopane: "twopane"
    };

    class ThredList {
        constructor() {
            this.changeWidtdhEventListners = [];
            this.getElements();
            if (this.contentLeft !== null && this.contentBody !== null) {
                this.ready = true;
                this.addEventListener();
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
        getElements() {
            this.contentLeft = document.querySelector(".gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-left");
            this.threadListItemLink = document.querySelectorAll(".gaia-argoui-space-threadlist-item-link");
            this.contentBody = document.querySelector(".gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-body");
            this.readMore = document.querySelector(".gaia-argoui-space-threadlist-readmore");
        }
        addEventListener() {
            this.readMore.addEventListener('click', () => {
                (async() => {
                    await timer(200);
                    this.getElements();
                    this.changeWidth(this.contentBody.offsetLeft);
                })();
            });
        }
        changeWidth(width) {
            // super heavy
            if (this.ready === false) {
                return;
            }
            let widthWithPx = width + "px";
            this.contentLeft.style.width = widthWithPx;
            this.threadListItemLink.forEach(element => {
                element.style.width = widthWithPx;
            });
            this.contentBody.style.marginLeft = widthWithPx;
            chrome.storage.local.set({ thredListWidth: width });
            this.changeWidtdhEventListners.forEach(listener => {
                listener();
            });
        }
        resetWidth() {
            this.contentLeft.style.width = null;
            this.threadListItemLink.forEach(element => {
                element.style.width = null;
            });
            this.contentBody.style.marginLeft = null;
            chrome.storage.local.remove(storageKeys.thredListWidth);
            this.changeWidtdhEventListners.forEach(listener => {
                listener();
            });
        }
        addChangeWidthEventListener(listner) {
            this.changeWidtdhEventListners.push(listner);
        }
    }

    class DraggableBar {
        constructor(threadlist) {
            this.setup(threadlist);
        }
        setup(threadlist) {
            this.draggableBar = document.querySelector("#kinspax-draggable-bar");
            if (this.draggableBar === null) {
                this.threadlist = threadlist;
                this.setupThreadlist();
                this.threadlist.addChangeWidthEventListener(() => {
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
            this.threadlist.contentLeft.ondragstart = () => {
                return false;
            };
            this.threadlist.contentBody.ondragstart = () => {
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
                    that.threadlist.changeWidth(event.pageX);
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
            
            this.draggableBar.addEventListener('dblclick', function () {
                that.threadlist.resetWidth();
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
            this.draggableBar.style.left = this.threadlist.contentBody.offsetLeft + "px";
        }
        insertBar() {
            this.threadlist.contentLeft.insertAdjacentElement('afterend', this.draggableBar);
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

    var draggable;
    var contentRight;
    var setup = () => {
        const intervalId = setInterval(() => {
            let threadlist = new ThredList();
            if (threadlist.ready === true) {
                if (draggable !== undefined) {
                    draggable.setup(threadlist);
                } else {
                    draggable = new DraggableBar(threadlist);
                }
                if (contentRight !== undefined) {
                    contentRight.setup();
                } else {
                    contentRight = new ContentRight(threadlist);
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