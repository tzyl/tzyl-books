angular.module('tzyl.controllers', [])

.controller('LoginCtrl', function($scope, $ionicModal, $ionicPopup, Auth) {
    $scope.loginData = {};
    $scope.signupData = {};
    $scope.resetData = {};
    $scope.loginFailed = false;
    $scope.signupFailed = false;
    $scope.resetFailed = false;
    $scope.loading = false;

    // Create modal for signup form.
    $ionicModal.fromTemplateUrl('templates/signup_modal.html', {
        scope: $scope
    }).then(function(modal) {
        $scope.signupModal = modal;
    });

    $scope.openSignup = function() {
        $scope.signupModal.show();
    }

    $scope.closeSignup = function() {
        $scope.signupModal.hide();
    }

    // Create modal for reset password form.
    $ionicModal.fromTemplateUrl('templates/reset_password_modal.html', {
        scope: $scope
    }).then(function(modal) {
        $scope.resetPasswordModal = modal;
    })

    $scope.openReset = function() {
        $scope.resetPasswordModal.show();
    }

    $scope.closeReset = function() {
        $scope.resetPasswordModal.hide();
    }

    $scope.login = function() {
        console.log($scope.loginData);
        $scope.loginFailed = false;
        $scope.loading = true;
        Auth.$signInWithEmailAndPassword($scope.loginData.email, $scope.loginData.password).then(function(firebaseUser) {
            console.log('Signed in as:', firebaseUser.displayName, firebaseUser.uid);
            resetForms();
        }, function(err) {
            console.log('Login failed!');
            console.log(err);
            $scope.loginFailed = true;
            showAlert('Login failed', err);
        }).finally(function() {
            $scope.loading = false;
        });
    }

    $scope.signup = function() {
        console.log($scope.signupData);
        $scope.signupFailed = false;
        $scope.loading = true;
        Auth.$createUserWithEmailAndPassword($scope.signupData.email, $scope.signupData.password).then(function(firebaseUser) {
            firebaseUser.updateProfile({
                displayName: $scope.signupData.username
            });
            console.log('User:', firebaseUser.displayName, firebaseUser.uid, 'created successfully!');
            resetForms();
            $scope.closeSignup();
        }, function(err) {
            console.log('Signup failed!');
            console.log(err);
            $scope.signupFailed = true;
            showAlert('Signup failed', err);
        }).finally(function() {
            $scope.loading = false;
        });
    }

    $scope.sendResetEmail = function() {
        console.log($scope.resetData);
        $scope.resetFailed = false;
        $scope.loading = true;
        Auth.$sendPasswordResetEmail($scope.resetData.email).then(function() {
            console.log('Successfully sent password reset email.');
            showAlert('Success!', 'We\'ve sent an email to you with instructions to reset your password');
            resetForms();
            $scope.closeReset();
        }, function(err) {
            console.log('Reset failed!');
            console.log(err);
            $scope.resetFailed = true;
            showAlert('Reset password failed!', err);
        }).finally(function() {
            $scope.loading = false;
        });
    }

    var showAlert = function(title, message) {
        var alertPopup = $ionicPopup.alert({
            title: title,
            template: message
        });
    }

    var resetForms = function() {
        console.log('Resetting form fields');
        $scope.loginData = {};
        $scope.signupData = {};
        $scope.resetData = {};
    }

})

.controller('AppCtrl', function($scope, User, Auth) {
    $scope.user = User;
    $scope.logout = Auth.$signOut;
})

.controller('BrowseListingsCtrl', function($scope, Listings) {
    $scope.recent = Listings.getRecent();
    $scope.listings = $scope.recent;
    $scope.mostRecent = true;
    $scope.loading = true;
    $scope.recent.$loaded().finally(function() { $scope.loading = false; });

    $scope.search = function(query) {
        if (!query) {
            $scope.listings = $scope.recent;
            $scope.mostRecent = true;
        } else {
            $scope.loading = true;
            $scope.mostRecent = false;
            Listings.searchListings(query).then(function(listings) {
                // Successfully found results for search.
                $scope.listings = listings;
            }, function(reason) {
                // Search was rejected (error or no results).
                console.log(reason);
                $scope.listings = [];
            }).finally(function() {
                $scope.loading = false;
            });
        }
    }

    $scope.$watch('listings', function() {
        console.log($scope.listings);
    });
})

.controller('ViewListingCtrl', function($scope, $location, Listings) {
    var listingId = $location.path().split(/[\s/]+/).pop();
    $scope.listing = Listings.getListing(listingId);
})

.controller('EditListingsCtrl', function($scope, $http, $timeout, $ionicModal, $ionicPopup, User, Listings) {
    $scope.user = User;
    $scope.loading = true;
    $scope.$watch('user.data', function() {
        if ($scope.user.data) {
            $scope.userListings = Listings.getByUser($scope.user.data.uid);
            $scope.userListings.$loaded().finally(function() { $scope.loading = false; });
        }
    });
    // Object to hold information on the current listing we are creating/editing.
    var Listing = function() {
        this.uid = User.data.uid;
        this.username = User.data.displayName;
    }

    Listing.prototype.parseGoogleBooksData = function(data) {
        this.title = data.title || 'No title found';
        this.author = data.authors || ['No author found'];
        this.publisher = data.publisher || 'No publisher found';
        this.subject = data.categories || ['No subject found'];
        this.bookDescription = data.description || 'No description found';
        this.pageCount = data.pageCount || 'No page count found';
        if (data.hasOwnProperty('imageLinks') && data.imageLinks.hasOwnProperty('thumbnail')) {
            this.thumbnail = data.imageLinks.thumbnail;
        }
    }
    // $scope.listing = new Listing();
    // Mode will be 'create' or 'edit' depending on current action by user.
    $scope.mode = 'create';

    $scope.sliderOptions = {
        touchRatio: 0
    };

    $scope.$on('$ionicSlides.sliderInitialized', function(event, data){
        // data.slider is the instance of Swiper
        $scope.slider = data.slider;
        console.log($scope.slider);
    });

    // Modal for creating/editing listing.
    $ionicModal.fromTemplateUrl('templates/create_listing_modal.html', {
        scope: $scope
    }).then(function(modal) {
        $scope.createListingModal = modal;
    });

    $scope.createListing = function() {
        $scope.listing = new Listing();
        $scope.mode = 'create';
        $scope.createListingModal.show();
        $scope.slider.slideTo(0, 0);
    }

    $scope.editListing = function(listing) {
        $scope.listing = listing;
        $scope.mode = 'edit';
        $scope.createListingModal.show()
        // Timeout to allow for initialization.
        $timeout(function() {
            $scope.slider.slideTo(2, 0);
        }, 100);
    }

    $scope.closeCreate = function() {
        $scope.createListingModal.hide();
    }

    $scope.searchIsbn = function(isbn) {
        console.log(isbn);
        var url = 'https://www.googleapis.com/books/v1/volumes?q=isbn:' + isbn;
        $http.get(url).then(function(response) {
            console.log(response);
            if (response.data.totalItems) {
                $scope.listing.parseGoogleBooksData(response.data.items[0].volumeInfo);
                $scope.slider.slideNext();
            }
        }, function(response) {
            console.log('Error getting ISBN details');
            console.log(response);
        });
    }

    // var parseGoogleBooksData = function(data) {
    //     console.log(data);
    //     if (data.totalItems) {
    //         var book = data.items[0];
    //         $scope.listing.title = book.volumeInfo.title;
    //         $scope.listing.author = book.volumeInfo.authors;
    //         $scope.listing.publisher = book.volumeInfo.publisher;
    //         $scope.listing.description = book.volumeInfo.description;
    //         $scope.listing.pageCount = book.volumeInfo.pageCount;
    //         $scope.listing.subject = book.volumeInfo.categories;
    //         $scope.listing.thumbnail = book.volumeInfo.imageLinks.thumbnail;
    //         console.log($scope.listing);
    //         // $scope.userListings.$add($scope.listing);
    //     }
    // }

    $scope.addListing = function() {
        if ($scope.mode == 'create') {
            $scope.listing.timestamp = firebase.database.ServerValue.TIMESTAMP;
            // $scope.listing.negativeTimestamp = -1 * $scope.listing.timestamp;
            $scope.userListings.$add($scope.listing).then(function(ref) { console.log(ref); }, function(err) { console.log(err); });
        } else if ($scope.mode == 'edit') {
            $scope.userListings.$save($scope.listing);
        }
        console.log($scope.listing);
        $scope.closeCreate();
    }

    $scope.removeListing = function(listing) {
        var confirmRemovePopup = $ionicPopup.confirm({
            title: 'Remove listing',
            template: 'Are you sure you want to remove your listing?',
            cancelType: 'button-stable button-stable-border'
        });

        confirmRemovePopup.then(function(res) {
            if (res) {
                $scope.userListings.$remove(listing);
            }
        });
    }

    $scope.addAuthor = function() {
        $scope.listing.author.push(null);
    }

    $scope.removeAuthor = function(index) {
        console.log(index);
        $scope.listing.author.splice(index, 1);
    }

    // $scope.clearListings = function() {
    //     for (var i = 0; i < $scope.userListings.length; i++) {
    //         $scope.userListings.$remove($scope.userListings[i]);
    //     }
    // }
})

// var listing = {
//     'uid': User.data.uid,
//     'username': User.data.displayName,
//     'timestamp': firebase.database.ServerValue.TIMESTAMP,
//     'title': 'Listing ' + $scope.userListings.length.toString(),
//     'subject': 'test subject',
//     'isbn': '123-456-789-0',
//     'description': 'test description'

.directive('expandableTextItem', function() {
    return {
        restrict: 'AE',
        scope: {
            heading: '@',
            text: '@'
        },
        templateUrl: 'templates/directives/expandable_text_item.html',
        link: function(scope, element, attr) {
            var maxLength = 130;
            scope.open = false;
            // When text changes check if we need the expanding functionality or not.
            scope.$watch('text', function() {
                scope.needed = scope.text.length > maxLength ? true : false;
                scope.shortText = scope.text.substr(0, maxLength);
            });
        }
    };
})

.directive('arrayInputItem', function() {
    return {
        restrict: 'AE',
        scope: {
            heading: '@',
            itemName: '@',
            data: '=',
            placeholder: '@'
        },
        templateUrl: 'templates/directives/array_input_item.html',
        link: function(scope, element, attr) {
            scope.addItem = function() {
                console.log(scope.data);
                scope.data.push(null);
            }

            scope.removeItem = function(index) {
                scope.data.splice(index, 1);
            }
        }
    }
});
